---
author: Tanjim Hossain
pubDatetime: 2023-09-18T15:34:00Z
title: Getting Started with Devcontainer
postSlug: getting-started-devcontainer
featured: true
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
ogImage: "assets/random/dev-container-stages.png"
description: A step-by-step guide to get started with dev container in vs code and GitHub codespaces. Including secrets management, feature development, and more.
---

## What is Devcontainer?

Devcontainer is an open specification for enriching containers with development-specific content and settings. VSCode and Github Codespaces currently have full support for it. You can find the official documentation [here](https://containers.dev/). It's a great way to ensure consistency across different environments and to make sure that your development environment is isolated from your host machine. It's also a great way to ensure that your development environment is reproducible.  
With devcontainer, you can easily share your development environment with your team, and you can also use it to develop on the go - using Github Codespaces or your remote docker context running on a Cloud VM, a Raspberry Pi, or your local machine (even if you don't have a public IP, more on that later)

## A Quick Dive

Let's first have a quick look at what a devcontainer is - by creating one. We'll create a simple devcontainer with Ubuntu. We'll use the [official vscode devcontainer tutorial](https://code.visualstudio.com/docs/remote/containers-tutorial) as a reference.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
  - in case you've configured remote docker context, you can use that too (more on that later)
  - Or, [Github Codespaces](https://github.com/codespaces) subscription
- [VSCode](https://code.visualstudio.com/) installed
- [VSCode remote development extension pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) installed

### Steps

- Create a folder named `devcontainer-tutorial` and open it in vscode.
- Press `Ctrl+Shift+P` to open the command palette, and select `Dev Containers: Add Development Container Configuration Files...`
- Select `Ubuntu` from the list of available configuration templates. Don't add any additional features for now. Don't worry, you can add them later. You should see a new directory named `.devcontainer` with a `devcontainer.json` file inside it.
- You should see a `open folder in container` button in the bottom right corner of your vscode window. Click on it. If not, press `Ctrl+Shift+P` and select `Dev Containers: Reopen in Container`. It'll take a while to build the container for the first time.
- You should see a terminal window in vscode. Run `ls` to see the contents of the current directory. You should see the same files as your host machine.

### What just happened?

VSCode created a docker container with Ubuntu and mounted the current directory as a volume inside the container. It also installed some vscode extensions inside the container.  
Now, as you have a terminal inside the container, you can run any command inside the container. You can also install any package inside the container. But remember, the container is ephemeral. If you exit the container, and reopen it, you'll have to install the packages again.  
For a more persistent solution, you can create a `Dockerfile` inside the `.devcontainer` folder [as described here](https://containers.dev/guide/dockerfile#dockerfile). You can also use a `docker-compose.yml` file to create a multi-container devcontainer [as described here](https://containers.dev/guide/dockerfile#docker-compose)

### What's a Feature?

Devcontainer features are pieces of configuration that can be reused across multiple devcontainers. Just as an example, [Here's a feature](https://github.com/audacioustux/devcontainers/tree/main/src/common-utils-extras) that installs some common utilities that I use in my devcontainers. There are a lot of official and community-driven features available, But I think you got the idea.

## A More Practical Example

Let's have a few files in our .devcontainer folder (then we'll discuss what they do):

`.devcontainer/devcontainer.json`

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

`.devcontainer/compose.yml`

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

`.devcontainer/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04
```

`.devcontainer/scripts/update.sh`

```bash
#!/usr/bin/env bash

set -eax

git clean -Xdf --exclude='!**/*.env'
```

`.devcontainer/scripts/post-create.sh`

```bash
#!/usr/bin/env bash

set -eax

# let's keep it blank for now
```

`.devcontainer/scripts/post-start.sh`

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
- The Docker Compose file to use, where we can declare more containers to use, e.g., a database container, a Redis container, etc.
- Which service is defined in the compose file to use for devcontainer.
- The workspace folder is inside the container. This is where the current directory will be mounted.
- The host requirements for the container. This is useful when using Github Codespaces, as you can specify the minimum requirements for the container. If the host machine doesn't meet the requirements, it'll show a warning.
- The vscode extensions are to be installed inside the container. You can copy the extension IDs from the vscode marketplace.
- The vscode settings to use. This is useful when you want to use different settings for different projects.
- The ports to forward from the container to the host machine. This is useful when you want to access a service running inside the container from your host machine.
- The features to use. You can find a list of official features [here](https://containers.dev/features). You can also create your own features. We'll discuss that later. Each feature can have its configuration. You can find the configuration options for each feature in the feature's documentation. It should be mentioned that each feature creates a cached layer in the container (it's ok if you don't understand what that means)
- The lifecycle scripts to run. More on that [Here](https://containers.dev/implementors/json_reference/#lifecycle-scripts). In the case of `postStartCommand` We're running it in the background, and redirecting the output to a log file. This is useful when you want to run some long-running tasks in the background, e.g., building a large project, running a server, or running `minikube tunnel`` in the background.

#### `compose.yml`

Here, we only defined a single service named `devcontainer`, and mounted the current directory as a Read+Writable volume inside the container.

#### `Dockerfile`

We used the Ubuntu image built for devcontainers as the base image. Instead of using features to install packages, we can also install them in the Dockerfile. But it's not recommended, as it'll make the container less portable, and any change in the Dockerfile will require the container to be rebuilt invalidating all the cache layers created by the features.

#### `post-create.sh`, `update.sh`, `post-start.sh`

These are the lifecycle scripts.

> Now, you may press `Ctrl+Shift+P` and select `Dev Containers: Rebuild Container` to rebuild the container. It'll take a while to build the container for the first time. After that, it'll be much faster.

## Creating Custom Features

In the devcontainer.json file, we used a custom feature named `ghcr.io/audacioustux/devcontainers/common-utils-extras:1`. That's a feature I created for my use. You can find the source code [here](https://github.com/audacioustux/devcontainers/tree/main/src/common-utils-extras). Instead of reinventing the wheel, I'll just link to the official documentation on how to create custom features: [here](https://github.com/devcontainers/feature-starter#readme)

## Troubleshooting & Tips

### Empty workspace folder inside the container, in case of Remote Docker Context

When using remote docker context, the workspace folder inside the container might be empty. This is because, the compose file is executed inside the remote docker context, on the remote machine, and the current directory is not mounted inside the remote machine.  
To resolve this, we can push the current directory to Github, then press `Ctrl+Shift+P` select `Dev` Containers: Clone Repository in Container Volume...` and select the repository. This will clone the repository inside a volume in the remote machine, and mount it inside the container.

### No public IP

Just use [tailscale](https://tailscale.com/). It's free for personal use, and it's very easy to set up. It'll give you a public IP for your local machine, even if you don't have a public IP. It's also very useful when you want to access your local machine from your phone, or from a remote machine.

### Using remote docker context

You can use remote docker context to run the devcontainer on a remote machine. You can find the official documentation [here](https://docs.docker.com/engine/context/working-with-contexts/).

### Docker taking up too much space

You should run `docker system prune` from time to time to free up some space [as described here](https://docs.docker.com/engine/reference/commandline/system_prune/). On Linux, you may have a cron job to do that automatically. Also, set a max size for logs [as described here](https://docs.docker.com/config/containers/logging/configure/).

## Discussion

### What about environment variables?

You may have wondered, why the extra `compose.yml` and `Dockerfile`, instead of setting the `image` field in `devcontainer.json`?  
Well, for two reasons:

1. It's more extensible. You can add more services to the compose file, and extend the base image in the Dockerfile in case you need to.
2. You can have a .env file in the `.devcontainer` folder, and docker-compose will take care of it implicitly. That means you should declare the environment variables in the compose file without any values, and docker-compose will automatically read the values from the .env file or the host machine's environment variables. The latter is useful when using GitHub Codespaces, as you can set the environment variables in the Codespaces settings. This way, you don't have to couple the source of env vars with the devcontainer.

### Why use Ubuntu as the base image?

Ubuntu is well-supported by the official features and ideal fit for development environments. Other options like Alpine would be too minimal, and require more work to get things working. There are also official images that come with specific tools and language runtimes (node, go, rust, etc.) installed. But tbh, I think most real projects use multiple languages and tools, so it's better to compose the official & community-driven devcontainer features on top of the base Ubuntu image. You may also create new devcontainer features if you want to, and share them with the community.

## Links

- A real project with devcontainer: [here](https://github.com/audacioustux/zeroSDP)
- Devcontainer features written by me: [here](https://github.com/audacioustux/devcontainers)
- Community devcontainer features: [here](https://github.com/devcontainers-contrib/features)
