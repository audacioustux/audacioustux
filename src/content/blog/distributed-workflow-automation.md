---
author: Tanjim Hossain
pubDatetime: 2023-10-9T11:14:00Z
title: Distributed Workflow Automation with Argo, on top of EKS (EFS, Autoscaler)
postSlug: knative-argo-grafana-eks
featured: true
draft: false
tags:
  - kubernetes
  - argo
  - argocd
  - argo-events
  - argo-workflow
  - eks
  - efs-csi
  - autoscaler
  - webhook
  - devops
  - rust
  - axum
  - lettre
  - smtp
  - pandoc
  - english
description: A glancethrough of how to use Argo tools to automate workflows (e.g., CI/CD, Security Scanning, etc.) in a distributed fashion, on top of EKS (with EFS CSI and Autoscaler) provisioned with Terraform.
---

## Introduction / Context

Project Link: <https://github.com/audacioustux/scan-automate>

So, the task in hand, was to automate some security scanning tools (e.g., rustscan, zap, etc.) - that can scale-out to multiple nodes if needed, and can be integrated with a web UI with an API endpoint. So the end workflow would look something like this:

- A API server takes a request with a URL to scan, and a email address to send the report to.
- The API server creates a singed JWT token of the scan request, and sends that to the email address, asking for confirmation.
- The user clicks on the link, and the api server receives the confirmation.
- The API server then triggers a Webhook (created with Argo Events EventSource) - in other words, triggers the workflow engine.
- A Argo Event Sensor takes the event, parses the request parameters (e.g., email, scanners to use and their configurations, etc.), and triggers a Argo Workflow.
- The Argo Workflow goes through some steps:
  - Runs the Scanners (containers) in parallel, and collects the results.
  - Generates a report (PDF) with the results (using Pandoc).
  - Saves the report to S3.
  - Sends a signed URL of the report to the email address.

![Argo Workflow DAG](https://audacioustux.com/assets/distributed-workflow-automation/argo-workflow-dag.png)

## Components

### Api Server

[Code](https://github.com/audacioustux/scan-automate/tree/main/scan-automate/crates/api)

The Api server basically has 3 endpoints:

- `/scans` - that takes the scan request, and sends a confirmation email.
- `/scans/confirm/:token` - that takes the confirmation token, and triggers the workflow engine.
- `/scans/progress/:id` - that takes the scan id, and returns the progress of the scan. (e.g., which scanner is running, which one is done, etc.)

![API server responding to scan request with scan id](https://audacioustux.com/assets/distributed-workflow-automation/api-server-scans.png)

It's written in Rust, with:

- `axum` for the web framework
- `lettre` for sending emails
- `nanoid` for generating unique scan ids
- `jsonwebtoken` for generating JWT tokens
- `clap` for parsing command line arguments (or from environment variables)
- `reqwest` for making HTTP requests to the webhook endpoint.

### Workflow Engine

[Argo EventSource & Sensor YAML](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/k8s/kustomize/scan-automate/webhook.yaml)  
[Argo Workflow YAML](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/k8s/kustomize/scan-automate/workflow-template.yaml)

Already explained in the introduction.

### EKS

[Terraform Code](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/terraform/main.tf#L48)

Uses two managed node groups:

- `general` - meant for platform, infra components (e.g., Argo CD, Argo Events, etc.)
- `spot` - meant for the workflow engine steps (e.g., running the scanners, generating the report, etc.)

### EFS CSI

[AWS EFS Setup with required IAM Policies](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/terraform/main.tf#L187)  
[Deployment of EFS Driver on EKS with Helm](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/terraform/main.tf#L330)

### Cluster Autoscaler

[Service account with required IAM Policies](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/terraform/main.tf#L170)  
[Deployment of Cluster Autoscaler on EKS with ArgoCD](https://github.com/audacioustux/scan-automate/blob/main/scan-automate/k8s/kustomize/cluster-autoscaler/cluster-autoscaler-autodiscover.yaml)

Scales Up and Down based on if there are any pending pods, or not.
Karpenter could be used instead, but for this project, Cluster Autoscaler was enough.

## End Result

### Demo UI

![Demo Interface](https://audacioustux.com/assets/distributed-workflow-automation/demo.png)

### Output PDF

![Output PDF](https://audacioustux.com/assets/distributed-workflow-automation/output-pdf.png)

## QnA

### Why EFS instead of EBS?

EFS is a network file system, so it can be mounted to multiple nodes at the same time. So, if we have a workflow that needs to scale-out to multiple nodes, EFS is the way to go. EBS is a block storage, so it can only be mounted to one node at a time.

### Why Argo?

Argo CD, Workflow, and Events is a great trio. I had already used to in the past for few other projects. So, I was already familiar with it. Also, Argo Workflow has a lot of built-in features. The retry menchanism, for example, is helpful in the situation where AWS spot instances are used. If a spot instance is terminated, the workflow will be retried on another node.  
Argo Event helped with not having to give the API server access to the Kubernetes cluster. The API server just triggers a webhook, and the workflow engine takes over from there.  
Argo CD is used to help with GitOps - as usual.

## End Notes

AWS has some problem if used with Terraform, as it doesn't delete some resources (e.g., load balancers). Terraform destroy will fail if those resources are not deleted. So, I had to manually delete those resources from the AWS console.

If you have any questions, feel free to ask in the comments below.
