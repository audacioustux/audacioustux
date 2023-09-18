---
author: Tanjim Hossain
pubDatetime: 2023-09-18T15:34:00Z
title: Getting Started with Devcontainer
postSlug: getting-started-devcontainer
featured: false
draft: false
tags:
  - devcontainer
  - vscode
  - docker
  - development
  - dx
  - productivity
  - containers
  - codespaces
  - github
  - english
ogImage: "assets/dev-container-stages.png"
description: A step-by-step guide to get started with devcontainer in vscode and github codespaces. Including secrets management, feature development, and more.
---

## What is Devcontainer?

Devcontainer is a feature of vscode that allows you to develop inside a container. It's a great way to ensure consistency across different environments, and to make sure that your development environment is isolated from your host machine. It's also a great way to ensure that your development environment is reproducible.  
With devcontainer, you can easily share your development environment with your team, and you can also use it to develop on the go - using Github Codespaces or your own remote docker context running on a Cloud VM, a Raspberry Pi, or your local machine (even if you don't have a public IP, more on that later)

## A Quick Dive

Let's first have a quick look at what a devcontainer is - by creating one. We'll create a simple devcontainer with Ubuntu. We'll use the [official vscode devcontainer tutorial](https://code.visualstudio.com/docs/remote/containers-tutorial) as a reference.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
  - in case you've configured remote docker context, you can use that too (more on that later)
  - Or, [Github Codespaces](https://github.com/codespaces) subscription
- [vscode](https://code.visualstudio.com/) installed
- [vscode remote development extension pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) installed

### Steps

- Create a folder named `devcontainer-tutorial` and open it in vscode.
- Press `Ctrl+Shift+P` to open the command palette, and select `Dev Containers: Add Development Container Configuration Files...`
- Select `Ubuntu` from the list of available configuration templates. Don't add any additional features for now. Don't worry, you can add them later. You should see a new directory named `.devcontainer` with a `devcontainer.json` file inside it.
- You should see a `open folder in container` button in the bottom right corner of your vscode window. Click on it. If not, press `Ctrl+Shift+P` and select `Dev Containers: Reopen in Container`. It'll take a while to build the container for the first time.
- You should see a terminal window in vscode. Run `ls` to see the contents of the current directory. You should see the same files as your host machine.

### What just happened?

VSCode created a docker container with Ubuntu, and mounted the current directory as a volume inside the container. It also installed some vscode extensions inside the container.  
Now, as you have a terminal inside the container, you can run any command inside the container. You can also install any package inside the container. But remember, the container is ephemeral. If you exit the container, and reopen it, you'll have to install the packages again.  
For a more persistent solution, you can create a `Dockerfile` inside the `.devcontainer` folder [as described here](https://containers.dev/guide/dockerfile#dockerfile). You can also use a `docker-compose.yml` file to create a multi-container devcontainer [as described here](https://containers.dev/guide/dockerfile#docker-compose)

## A More Practical Example

Let's have a few files in out .devcontainer folder (then we'll discuss what they do):

> .devcontainer/devcontainer.json

```json
{
  "name": "XYZ Dev Container",
  "dockerComposeFile": "compose.yml",
  "service": "devcontainer",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "customizations": {
    "vscode": {
      "extensions": ["mutantdino.resourcemonitor"],
      "settings": {
        "git.autofetch": true,
        "files.autoSave": "onFocusChange",
        "editor.formatOnSave": true,
        "editor.formatOnPaste": true,
        "resmon.show.cpufreq": false
      }
    }
  },
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb"
  },
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "configureZshAsDefaultShell": true
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "dockerDashComposeVersion": "v2"
    },
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {},
    "ghcr.io/audacioustux/devcontainers/common-utils-extras:1": {}
  },
  "updateContentCommand": ".devcontainer/scripts/update.sh",
  "postCreateCommand": ".devcontainer/scripts/post-create.sh",
  "postStartCommand": "nohup bash -c '.devcontainer/scripts/post-start.sh &' > /tmp/post-start.log 2>&1",
  "forwardPorts": [8080]
}
```

> .devcontainer/compose.yml

```yaml
services:
  devcontainer:
    build:
      context: .
    volumes:
      - ../..:/workspaces:rw,cached
    init: true

    command: sleep infinity
```

> .devcontainer/Dockerfile

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04
```

> .devcontainer/scripts/update.sh

```bash
#!/usr/bin/env bash

set -eax

git clean -Xdf --exclude='!**/*.env'
```

> .devcontainer/scripts/post-create.sh

```bash
#!/usr/bin/env bash

set -eax

# let's keep it blank for now
```

> .devcontainer/scripts/post-start.sh

```bash
#!/usr/bin/env bash

set -eax
# -e exit on error
# -a export functions by default
# -x print commands before executing

# build-pkg1(){}
# build-pkg2(){}
# some-long-running-task(){}

# parallel --halt now,fail=1 \
#     --linebuffer \
#     -j0 ::: \
#         "build-pkg1" \
#         "build-pkg2"

# some-long-running-task
```

> run `chmod +x .devcontainer/scripts/*.sh` to make the scripts executable

### What's going on here?

We've just created a devcontainer with a few features. Let's discuss them one by one.

#### `devcontainer.json`

This is where we declare:

- The name of our devcontainer. It can be anything.
- The Docker Compose file to use, where we can declare more containers to use, e.g., a database container, a redis container, etc.
- Which service defined in the compose file to use for devcontainer.
- The workspace folder inside the container. This is where the current directory will be mounted.
- The host requirements for the container. This is useful when using Github Codespaces, as you can specify the minimum requirements for the container. If the host machine doesn't meet the requirements, it'll show a warning.
- The vscode extensions to install inside the container. You can copy the extension ids from the vscode marketplace.
- The vscode settings to use. This is useful when you want to use different settings for different projects.
- The ports to forward from the container to the host machine. This is useful when you want to access a service running inside the container from your host machine.
- The features to use. You can find a list of official features [here](https://containers.dev/features). You can also create your own features. We'll discuss that later. Each feature can have its own configuration. You can find the configuration options for each feature in the feature's documentation. It should be mentioned that, each feature creates a cached layer in the container (it's ok if you don't understand what that means)
- The lifecycle scripts to run. More on that [Here](https://containers.dev/implementors/json_reference/#lifecycle-scripts). In-case of `postStartCommand` We're running it in the background, and redirecting the output to a log file. This is useful when you want to run some long running tasks in the background, e.g., building a large project, running a server, or run `minikube tunnel` in the background.

#### `compose.yml`

Here, we only defined a single service named `devcontainer`, and mounted the current directory as a Read+Writable volume inside the container.

#### `Dockerfile`

We used the Ubuntu image built for devcontainers as the base image. Instead of using features to install packages, we can also install them in the Dockerfile. But it's not recommended, as it'll make the container less portable, and any change in the Dockerfile will require the container to be rebuilt invalidating all the cache layers created by the features.

#### `post-create.sh`, `update.sh`, `post-start.sh`

These are the lifecycle scripts.

## Creating Custom Features

In the devcontainer.json file, we used a custom feature named `ghcr.io/audacioustux/devcontainers/common-utils-extras:1`. That's a feature I created for my own use. You can find the source code [here](https://github.com/audacioustux/devcontainers/tree/main/src/common-utils-extras). Instead of re-inventing the wheel, I'll just link to the official documentation on how to create custom features: [here](https://github.com/devcontainers/feature-starter#readme)

## Troubleshooting & Tips

### Empty workspace folder inside the container, in case of Remote Docker Context

When using remote docker context, the workspace folder inside the container might be empty. This is because, compose file is executed inside the remote docker context, on the remote machine, and the current directory is not mounted inside the remote machine.  
To resolve this, we can push the current directory to github, then press `Ctrl+Shift+P` and select `Dev Containers: Clone Repository in Container Volume...` and select the repository. This will clone the repository inside a volume in the remote machine, and mount it inside the container.

### No public IP

Just use [tailscale](https://tailscale.com/). It's free for personal use, and it's very easy to setup. It'll give you a public IP for your local machine, even if you don't have a public IP. It's also very useful when you want to access your local machine from your phone, or from a remote machine.

### Using remote docker context

You can use remote docker context to run the devcontainer on a remote machine. You can find the official documentation [here](https://docs.docker.com/engine/context/working-with-contexts/).
