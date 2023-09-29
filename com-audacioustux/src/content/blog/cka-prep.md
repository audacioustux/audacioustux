---
author: Tanjim Hossain
pubDatetime: 2023-9-29T10:32:40Z
title: Certified Kubernetes Administrator (CKA) Exam Preparation
postSlug: cka-prep
featured: false
draft: false
tags:
  - kubernetes
  - certification
  - exam
  - container
  - devops
  - roadmap
  - tips
  - english
ogImage: "assets/nature-2129493_1280.jpg"
description: A collection of resources and tips, that helped me prepare for the Certified Kubernetes Administrator (CKA) exam.
---

## Introduction / Context

Certified Kubernetes Administrator (CKA) is a certification program by the Cloud Native Computing Foundation (CNCF), offered through the Linux Foundation. It is designed to validate your skills, knowledge, and competency in Kubernetes cluster administration.

[Certified Kubernetes Administrator (CKA) - Linux Foundation](https://www.cncf.io/certification/cka/)

This is kind of a brain-dump of my CKA exam preparation. Instead of writing down every definition, description, and re-iterating the same things that are already have been written & said by others, I'll just point to them (, and use AI help to fill the voids 😅).

## Prerequisites

- _**Linux**_: or more precisely, the common builtin command line tools like (in no particular order):
  - _**grep**_: search for patterns in files
  - _**sed**_: stream editor for filtering and transforming text
  - _**awk**_: pattern scanning and processing language
  - _**ps**_: report a snapshot of the current processes
  - _**ls**_: list directory contents and permissions
  - _**chmod**_: change file mode bits
  - _**chown**_: change file owner and group
  - _**man**_: documentation for commands and programs
  - _**find**_: search for files in a directory hierarchy
  - _**xargs**_: build and execute command lines from standard input
  - _**cat**_: concatenate files and print on the standard output
  - _**tail**_: output the last part of files
  - _**head**_: output the first part of files
  - _**less**_: opposite of more
  - _**tr**_: translate or delete characters
  - _**wc**_: print newline, word, and byte counts for each file
  - _**sort**_: sort lines of text files
  - _**uniq**_: report or omit repeated lines
  - _**cut**_: remove sections from each line of files
  - _**tee**_: read from standard input and write to standard output and files
  - _**tar**_: an archiving utility
  - _**curl**_: transfer a URL
  - _**jq**_: command-line JSON processor
  - _**base64**_: base64 encode/decode data and print to standard output
  - _**openssl**_: OpenSSL command line tool
  - _**ssh**_: OpenSSH SSH client (remote login program)
  - _**scp**_: secure copy (remote file copy program)
  - _**systemctl**_: control the systemd system and service manager
  - _**vim**_: Vi IMproved, a programmer's text editor
  - _**tmux**_ (optional): terminal multiplexer

  This is not a random list btw, these are the most common tools that you'll need to use during the exam. But don't get overwhelmed - most of these are very easy to learn, and only simple use-cases are required for the exam.  
  `tmux` is optional, but it's a very useful if you have time to learn it. Just practice basic navigation, pane management, scrolling, copy-pasting and you'll be good to go.

- _**Docker**_: Kodekloud and kunal kushwaha both have good docker courses. Although it's not required for CKA, it's a good idea to have a good understanding of docker before starting with kubernetes. At-least some familiarity with docker commands, files, images, networking, volumes, docker-compose, etc. is recommended. Those can certainly help to grasp kubernetes concepts faster.

- _**Kubernetes**_: You may want to have a high level understanding of kubernetes. CKA is not a beginner level exam. It's not a good idea to start with CKA as your first kubernetes experience. Get familiar with the basic concepts of kubernetes, like pods, deployments, services, volumes, etc. before starting with CKA. Start with Minikube or K3s on your laptop / desktop, and have some hands-on experience following online tutorials and resources. Free youtube courses are good enough for this.

## Preparation

Personally I followed the [CKA Certification](https://kodekloud.com/courses/certified-kubernetes-administrator-cka/), and the [Ultimate CKA Mock Exam](https://kodekloud.com/courses/ultimate-certified-kubernetes-administrator-cka-mock-exam/) course on Kodekloud.  
[KoudKloud Community FAQ](https://github.com/kodekloudhub/community-faq) repo is a nice resource to get answers to common questions around the exam.  

That's all...  
I've seen many posts on reddit and linkedin just like this one I'm writing now.., but i think most of them just boils down to what's said and shared above.

I've been using linux for 10+ years, and docker, kubernetes for 6+ years. So, I didn't have to spend much time on the basics. But if you're new to linux, docker, and kubernetes - you may want to follow a complete learning path, like [KodeKloud CKA Learning Path](https://kodekloud.com/learning-path/cka/), [Roadmap.sh DevOps](https://roadmap.sh/devops), or any other similar learning path.

But again, CKA exam needs hands-on experience. So just reading and watching videos won't help. You need to practice. Not necessarily on a real cluster, but at-least on a local cluster.

If your local machine is not powerful enough to run a cluster, you may try [Github Codespaces](https://github.com/codespaces) with `docker-in-docker` and `kubectl-helm-minikube` features enabled. Also, cloud providers and some platforms gives free credits for students. You may use those to practice. [More on Codespaces & DevContainers](https://audacioustux.com/posts/getting-started-devcontainer/)

## Extra Links

- [Curriculum - CNCF](https://github.com/cncf/curriculum/tree/master)
- [@TechWorldwithNana](https://www.youtube.com/@TechWorldwithNana)
- [@KodeKloud](https://www.youtube.com/@KodeKloud)
- [@Kunal Kushwaha](https://www.youtube.com/@KunalKushwaha)
