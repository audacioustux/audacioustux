---
author: Tanjim Hossain
pubDatetime: 2023-10-9T11:14:00Z
title: Knative + Argo (CD + Workflow + Events) + Grafana on EKS
postSlug: knative-argo-grafana-eks
featured: true
draft: false
tags:
  - kubernetes
  - knative
  - argo
  - argocd
  - argo-events
  - argo-workflow
  - grafana
  - kaniko
  - eks
  - prometheus
  - cloudflare-tunnel
  - github
  - webhook
  - vegeta
  - devops
  - english
ogImage: "assets/random/knative-argo-grafana-eks.png"
description: A walkthrough of setting up Knative, Argo (CD + Workflow + Events), Grafana, Prometheus on EKS.
---

## Introduction / Context

Recently I had an interesting opportunity to work on building a self-service platform with Knative in center. [Knative](https://knative.dev/) is a Kubernetes-based platform to build, deploy, and manage modern serverless workloads. It provides a set of middleware components that are essential to building modern, source-centric, and container-based applications that can run anywhere: on-premises, in the cloud, or even in a third-party data center. It is a platform that is built on top of Kubernetes and is designed to be portable across different cloud providers.

In this post, I'll document the whole process, so that someone from the future (potentially me) may find it useful. I'll also try to include some debugging tips, that I found useful while working on this project. The official documentation of Knative is good, but not great. The official manifests are too inconsistent, and the documentation is not always up-to-date. So here it goes.

> _**Caution**_: The point of this project was to have a basic setup up and running, so I didn't bother with some ideal best practices - like using proper RBAC, bootstrapping with EKS Blueprints, or parameterizing the Terrafrom + K8s manifests, using a secret store / vault, etc.

## Prerequisites

Before diving into a managed Kubernetes solution like [EKS](https://aws.amazon.com/eks/), that may cost you a lot of money along the way, I'd recommend using [Minikube](https://minikube.sigs.k8s.io/docs/) with --driver=docker. I'm a big fan of DevContainers, you may find detail about it in my previous post: [https://audacioustux.com/posts/getting-started-devcontainer/](https://audacioustux.com/posts/getting-started-devcontainer/) - it's optional though.

The whole setup may require at least 4 vCPUs and 8GB of RAM. On my EKS setup, I used 3 nodes of m5.large (2 vCPU, 8GB RAM, AL2_x86_64).

Also, you'll need to have the following tools installed:

- [Kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Argocd CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/)
- [Argo CLI](https://argoproj.github.io/argo-workflows/walk-through/argo-cli/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli)
- [Ebort](https://gist.github.com/audacioustux/b4719a6044cbdbe9deddc1da4021bd72) (copy this script to your $PATH)
- [Task](https://taskfile.dev/#/installation) (optional)

## Setup

Let's first create a bash script to automate some of the repetitive tasks and make things reproducible. Create a file named `up.sh` with the following content:

```bash
#!/usr/bin/env bash

set -eax
# -e = exit immediately if a command exits with a non-zero status.
# -a = each variable or function that is modified or created is given the export attribute. Usefull for using with `parallel` command.
# -x = print a trace of simple commands and their arguments after they are expanded and before they are executed. Useful for debugging, but bad for security.

# get the remote repo url
export REPO=`git remote get-url origin`
# argocd cli options - every argocd command will create a port-forward to argocd server, and close it after the command is finished.
export ARGOCD_OPTS='--port-forward --port-forward-namespace argocd'

deploy-argocd(){
    # Note: This is not ideal - but it's good enough for a quick setup
    echo "Deploying argocd..."
    # create argocd namespace declaratively, so the script can be run multiple times without any error
    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

    kubectl apply -k k8s/kustomize/argocd -n argocd
    # wait for all argocd pods to be ready. this may take a while.
    echo "Waiting for all argocd pods to be ready..."
    kubectl wait --for=condition=ready pod \
        --all \
        -n argocd \
        --timeout=300s
}

login-argocd(){
    echo "Logging in to argocd..."
    # Note: ideally, password should be stored in a secret store / vault, argocd-secret should be patched with bcrypt hash of the password:
    # local password=`argocd account bcrypt --password ${ARGOCD_PASSWORD:?}`
    # kubectl patch secret argocd-secret \
    #     -n argocd \
    #     -p '{"stringData": {"admin.password": "'$password'"}}'
    # and argocd-initial-admin-secret should be deleted
    local password=`kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`

    argocd login --username admin --password $password
}

add-private-repos(){
    # add private repos to argocd so that argocd can access them
    echo "Adding private repo..."
    local repo_url=($REPO)

    for repo in "${repo_url[@]}"
    do
        argocd repo add $repo --username ${GIT_USERNAME:?} --password ${GIT_TOKEN:?}
    done
}

deploy-argocd-apps(){
    # deploy all the Application.argoproj.io manifests in k8s/apps directory
    # Note: ideally, it should be done in Apps of Apps pattern.
    echo "Deploying argocd apps..."
    kubectl apply --recursive -f k8s/apps
}

deploy-secrets(){
    # deploy secrets, that will be used for CI/CD pipelines.
    echo "Deploying secrets..."
    local git=`kubectl create secret generic git-config --from-literal=username=$GIT_USERNAME --from-literal=password=$GIT_TOKEN --dry-run=client -o yaml`
    local docker=`kubectl create secret generic docker-config --from-file=$HOME/.docker/config.json --dry-run=client -o yaml`

    echo "$git" | kubectl apply -n argo -f -
    echo "$docker" | kubectl apply -n argo -f -
}

deploy-argocd
login-argocd
add-private-repos
deploy-argocd-apps

# ebort - is a script that re-tries a command until it succeeds. This is useful as some of the namespaces are created by argocd apps, and it may take a while for the namespaces to be created.
# 2> /dev/null is used to suppress the error messages.
ebort -- deploy-secrets 2> /dev/null

```

Okay, this script will fail, because we don't have the manifests yet. Let's create the manifests now.

### ArgoCD

[ArgoCD](https://argo-cd.readthedocs.io/en/stable/) is a declarative, GitOps continuous delivery tool for Kubernetes. Or in other words, it listens to changes in your Git repository and deploys the manifests to your Kubernetes cluster. It also provides a nice UI to visualize the state of your cluster, and the applications running on it.

Let's create a [Kustomize](https://kustomize.io/) base for ArgoCD. Create a file named `k8s/kustomize/argocd/kustomization.yaml` with the following content:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argocd
resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

patches:
  - path: configmap-patch.yaml
```

and `k8s/kustomize/argocd/configmap-patch.yaml` with the following content:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  resource.compareoptions: |
    # disables status field diffing in specified resource types
    ignoreAggregatedRoles: true
```

Why the patch? Hmm, it's out of scope for this post. But you can find out more about it from [here](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/#ignoring-rbac-changes-made-by-aggregateroles).

Now, let's create the ArgoCD application manifests. Start with Argo Workflows.

### Argo Workflows

[Argo Workflows](https://argoproj.github.io/argo-workflows/) is an open-source container-native workflow engine for orchestrating parallel jobs on Kubernetes. In this project, we'll use Argo Workflows to run CI/CD pipelines, instead of the other alternatives (e.g. GitHub Actions, Tekton, etc.). The reason is simple - Argo Workflows is a Kubernetes native solution, and it's very easy to integrate with other Kubernetes native tools like ArgoCD, Argo Events, etc.

Create a file named `k8s/apps/argo-workflow.yaml` with the following content:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-workflows
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  annotations:
    argocd.argoproj.io/sync-wave: "10"
spec:
  project: default
  destination:
    namespace: argo
    server: "https://kubernetes.default.svc"
  source:
    path: k8s/kustomize/argo-workflows
    repoURL: "<your-repo-url>"
    targetRevision: HEAD
  syncPolicy:
    automated:
      prune: true
      allowEmpty: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      # why ServerSideApply?
      # https://github.com/prometheus-community/helm-charts/issues/3435
      - ServerSideApply=true
```

replace `<your-repo-url>` with your repo URL. Now, create the directory `k8s/kustomize/argo-workflows` and create a file named `k8s/kustomize/argo-workflows/kustomization.yaml` with the following content:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argo
resources:
  - https://github.com/argoproj/argo-workflows/releases/download/v3.4.11/install.yaml
  - rbac.yaml
```

and `k8s/kustomize/argo-workflows/rbac.yaml` with the following content:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: default.service-account-token
  annotations:
    kubernetes.io/service-account.name: default
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argo-cluster-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: default
    namespace: argo
```

The `rbac.yaml` just creates a cluster-admin binding for the default service account in the argo namespace. That's too much privilege, don't do this in production.

### Test `up.sh` script

At this point, we'll ignore everything else, and test if the up.sh script we created earlier works as expected. Do the following:

- make sure the script is executable: `chmod +x up.sh`
- $GIT_USERNAME, $GIT_TOKEN environment variables are set. You can find / create your git token from [Profile -> Developer settings -> Personal access tokens](https://github.com/settings/tokens).
- ~/.docker/config.json is created with docker login credentials. You can create it by running `docker login` command.
  then, run the script: `./up.sh`  
  It should end with no error (except some port-forward errors, which is probably a bug in argocd cli).

#### ArgoCD UI

Let's check if ArgoCD UI is accessible. Run the following command:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

open `localhost:8080`. The username is `admin` and for password - open another terminal, and run the following command:

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d
```

If the ArgoCD works as expected, you should see the Argo Workflows application in the UI, and its status should be `Synced`. If not, try to debug the issue.

#### Argo Workflows UI

Let's check if Argo Workflows UI is accessible. Run the following command:

```bash
kubectl port-forward svc/argo-server -n argo 8081:2746
```

open `localhost:8081`. You should see the Argo Workflows UI.

The token for Argo Workflows UI can be found by running the following command:

```bash
echo "Bearer $(kubectl get secret -n argo default.service-account-token -o=jsonpath='{.data.token}' | base64 --decode)"
```

### Knative

Knative has a few components, and each of them can be installed separately. We'll use the Knative Operator to install the components.

[Knative Serving](https://knative.dev/docs/serving/) is the component that provides request-driven computing that can scale to zero.

We'll use Kourier as the ingress controller for Knative Serving, and sslip.io as the DNS provider.

The relevant manifests are:

- [k8s/apps/knative-operator.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-apps-operator-yaml)
- [k8s/kustomize/knative-operator/kustomization.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-operator-kustomization-yaml)
- [k8s/apps/knative-serving.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-apps-serving-yaml)
- [k8s/kustomize/knative-serving/kustomization.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-serving-kustomization-yaml)
- [k8s/kustomize/knative-serving/default-domain.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-serving-default-domain-yaml)
- [k8s/kustomize/knative-serving/service-monitors.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-serving-service-monitors-yaml)
- [k8s/kustomize/knative-serving/dashboards.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-serving-dashboards-yaml)  
   The total count of requests served is calculated with `sum(max_over_time(activator_request_count{configuration_name="$configuration"}[7d]))`
  here, `max_over_time` is used to get the max value of multiple series (one series for every scale-up from 0 to 1 pod), and `sum` is used to sum the values of all the series.
  ![activator_request_count](https://audacioustux.com/assets/random/promql-activator_request_count.png)
- [k8s/kustomize/knative-serving/serving.yaml](https://gist.github.com/audacioustux/08165349c5527b90ada709a81a3400d3#file-serving-yaml)

then run `./up.sh` again, or just apply the apps/knative-operator.yaml and apps/knative-serving.yaml manifests with kubectl

#### Test Knative Serving

Let's test if Knative Serving works as expected. Run the following command:

```bash
kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld-go
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "10"
    spec:
      containers:
          - image: docker.io/tanjim/helloworld-go
EOF
```

Then run `kubectl get pod -w`, a new pod should be created, and it should be in `Running` state. Then run `kubectl get ksvc helloworld-go`, you should see the URL of the service. Open the URL in your browser, you should see `Hello World!` message.

You can also see autoscaling in action by using [Vegeta](https://github.com/tsenart/vegeta)

```bash
echo "GET https://helloworld-go.knative-serving.127.0.0.1.sslip.io" | vegeta attack -insecure -workers 20 -rate 200 | vegeta report
```

and watch the pod count with `kubectl get pod -w`.

The `autoscaling.knative.dev/target: "10"` annotation in the manifest tells Knative Serving to scale up pods if the request rate is more than 10 active requests per second.

### CI / CD with Argo Workflows

Now, let's create a CI / CD pipeline with Argo Workflows. We'll use [Kaniko](https://github.com/GoogleContainerTools/kaniko) to build the docker image, and [Argo Events](https://argoproj.github.io/argo-events/) to trigger the pipeline on git push.

[Kpack](https://github.com/buildpacks-community/kpack) is another alternative, but let's use Kaniko for now.

First, we need to deploy [Argo Events](https://argoproj.github.io/argo-events/). This will allow us to create a `EventSource` - that will listen to events coming from Github on a specific webhook URL (provided by Argo Events), and `Sensor` - that will sense git push events, and trigger the Argo Workflow.

Just like Argo Workflows and Knative, We'll use ArgoCD to deploy Argo Events. The relevant manifests are:

- [k8s/apps/argo-events.yaml](https://gist.github.com/audacioustux/2f4ab9c35b0cdc27354e5a21930ac57a#file-apps-events-yaml)
- [k8s/kustomize/argo-events/kustomization.yaml](https://gist.github.com/audacioustux/2f4ab9c35b0cdc27354e5a21930ac57a#file-events-kustomization-yaml)
- [k8s/kustomize/argo-events/rbac.yaml](https://gist.github.com/audacioustux/2f4ab9c35b0cdc27354e5a21930ac57a#file-events-rbac-yaml)

and for EventSource and Sensor:

- [k8s/apps/ci-workflow.yaml](https://gist.github.com/audacioustux/4331624591e46e5eac207a78cab5e703#file-apps-ci-workflow-yaml)
- [k8s/ci-workflow/ci-workflow-template.yaml](https://gist.github.com/audacioustux/4331624591e46e5eac207a78cab5e703#file-ci-workflow-template-yaml)
- [k8s/ci-workflow/ci-workflow-trigger.yaml](https://gist.github.com/audacioustux/4331624591e46e5eac207a78cab5e703#file-ci-workflow-trigger-yaml)

then run `./up.sh` again, or just apply the apps/argo-events.yaml and apps/ci-workflow.yaml manifests with kubectl.

Remember to replace the `<...>` placeholders with your values.

The webhooks could be created automatically by Argo Events if an API  key with webhooks permission is specified in EventSource manifest - but for this project, we'll create the webhooks manually. Just go to the Github repo -> Settings -> Webhooks -> Add webhook.

#### Test CI / CD

If everything works as expected, then pushing to the repo should trigger a webhook event, EventSource should receive the event, and the Sensor should trigger the Argo Workflow. You can check the status of the workflow from Argo Workflows UI.

### Grafana + Prometheus

Now, let's deploy Grafana and Prometheus. We'll use [Kube Prometheus Stack](https://github.com/prometheus-community/helm-charts).

The relevant manifests are:

- [k8s/apps/kube-prometheus-stack.yaml](https://gist.github.com/audacioustux/8a64723a456d1b8bae585501603cc650#file-apps-kube-prometheus-stack-yaml)

then run `./up.sh` again, or just apply the apps/kube-prometheus-stack.yaml manifest with kubectl.

#### Test Grafana + Prometheus

Let's test if Grafana and Prometheus works as expected. If the dashboards on Grafana works as expected, then it's working as expected.

To access Grafana UI, run the following command:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

open `localhost:3000`. The username is `admin` and password is `prom-operator`.

![grafana-dashboards](https://audacioustux.com/assets/random/knative-argo-grafana-eks.png)

### Elastic Kubernetes Service (EKS)

Now let's create an EKS cluster. We'll use [Terraform](https://www.terraform.io/) to create the cluster.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5"
    }
  }
  required_version = "~> 1"
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  cluster_name = "ec-eks"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "ec-vpc"

  cidr = "10.0.0.0/16"
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_support   = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = 1
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"             = 1
  }
}

module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name    = local.cluster_name
  cluster_version = "1.27"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    AL2_x86_64 = {
      name = "node-group-al2-x86-64"

      ami_type       = "AL2_x86_64"
      instance_types = ["m5.large"]
      capacity_type  = "SPOT"

      min_size     = 2
      max_size     = 5
      desired_size = 3
    }
  }
}

data "aws_iam_policy" "ebs_csi_policy" {
  arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

module "irsa-ebs-csi" {
  source = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"

  create_role                   = true
  role_name                     = "AmazonEKSTFEBSCSIRole-${module.eks.cluster_name}"
  provider_url                  = module.eks.oidc_provider
  role_policy_arns              = [data.aws_iam_policy.ebs_csi_policy.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
}

resource "aws_eks_addon" "ebs-csi" {
  cluster_name             = module.eks.cluster_name
  addon_name               = "aws-ebs-csi-driver"
  service_account_role_arn = module.irsa-ebs-csi.iam_role_arn
  tags = {
    "eks_addon" = "ebs-csi"
    "terraform" = "true"
  }
}

variable "region" {
  type         = string
  default      = "us-east-1"
}

output "cluster_endpoint" {
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  value       = module.eks.cluster_security_group_id
}

output "cluster_name" {
  value       = module.eks.cluster_name
}
```

## Troubleshooting

### The Webhook endpoint is not accessible from outside (Local machine)

If you're using Kubernetes on your local machine, and don't have a public IP, then you may want to use [Cloudflare Zero Trust Access Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose the webhook endpoint to the internet.  
We can deploy cloudflared as a deployment in the cluster, and then add a public hostname:

![cloudflare-tunnel-webhook-config](https://audacioustux.com/assets/random/cloudflare-tunnel-webhook-config.png)

Relevet manifests:

- [k8s/apps/cloudflared.yaml](https://gist.github.com/audacioustux/5f8ab1cf4ec6810d0ab4a5af5b1d1b58#file-apps-cloudflared-yaml)
- [k8s/kustomize/cloudflared/kustomization.yaml](https://gist.github.com/audacioustux/5f8ab1cf4ec6810d0ab4a5af5b1d1b58#file-cloudflared-kustomization-yaml)
- [k8s/kustomize/cloudflared/deployment.yaml](https://gist.github.com/audacioustux/5f8ab1cf4ec6810d0ab4a5af5b1d1b58#file-cloudflared-deployment-yaml)

then run `./up.sh` again, or just apply the apps/cloudflared.yaml manifest with kubectl.

Or, you can use [ngrok](https://ngrok.com/) to expose the webhook endpoint to the internet. Useful if you don't have a domain name registered.

### ArgoCD apps not syncing

Ummm, have you pushed the manifests to the repo? If yes, there might be some issue. Try to pinpoint which resource is failing to sync, then read the logs or events of that resource - that may give you some clue.
There's just so many things that can go wrong, so I can't really give a generic solution. But here are some of the issues I faced:

- Volumes not created: a CSI driver may not be installed, or the CSI driver may not have the required permissions. In case of EKS, you may install the ebs-csi driver.
- Service selector not matching: the labels on pods might not be consistent with the label selector of the service. The official knative manifests have this issue.
- Architecture mismatch: the image architecture may not match with the node architecture. For example, if you're using a node with arm64 architecture, and the image is built for amd64 architecture, then the image won't run on the node. If you want the knative servings to be multi-arch, then configure kaniko accordingly.
- Secrets not created: You must create the required secrets that are already mentioned above.

that's all I can remember for now.

## Extra

### Taskfile

I used [Task](https://taskfile.dev/#/) as an alternative to Makefile.

```yaml
# https://taskfile.dev/
version: "3"

tasks:
  default: task --list-all
  up: bin/up.sh
  cf-tunnel:
    vars:
      NS: cloudflared
    cmds:
      - kubectl create ns {{.NS}} --dry-run=client -o yaml | kubectl apply -f -
      - kubectl apply -k k8s/kustomize/cloudflared -n {{.NS}}
      - kubectl create secret generic cloudflare-config --from-literal=TUNNEL_TOKEN=$CLOUDFLARE_TUNNEL_TOKEN --dry-run=client -o yaml | kubectl apply -n {{.NS}} -f -
  argo-password: echo "Bearer $(kubectl get secret -n argo default.service-account-token -o=jsonpath='{.data.token}' | base64 --decode)"
  argocd-password: echo "$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)"
  traffic-simulate: echo "GET https://ec-helloworld-go.knative-serving.127.0.0.1.sslip.io" | vegeta attack -insecure -workers 20 -rate 200 | vegeta report
  grafana-port-forward: ebort -- kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80 2> /dev/null
  update-kubeconfig:
    dir: terraform
    cmd: aws eks --region $(terraform output -raw region) update-kubeconfig --name $(terraform output -raw cluster_name)
```

## Epilogue

This was done as a part of a bigger project, and I had to do a lot of debugging to get everything working. I hope this post will help someone in the future. If you have any questions, feel free to ask in the comments section below. Thanks for reading `(ღ˘⌣˘ღ)`
