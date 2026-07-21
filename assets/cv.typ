// =============================================================================
// Tanjim Hossain — Curriculum Vitae  ·  Typst 0.14
// Font: Lato (bundled in ./fonts).
//   Build:  typst compile --font-path fonts cv.typ cv.pdf
//   No-font build: set `body-font` below to "Carlito" or "Liberation Sans".
// =============================================================================

#set document(title: "Tanjim Hossain — CV", author: "Tanjim Hossain")

// ---- Design tokens (restyle the whole document from here) -------------------
#let body-font = "Lato"
#let ink    = rgb("#1f2328") // body text — warm near-black
#let accent = rgb("#1c3d5a") // name, section titles, links — deep slate navy
#let muted  = rgb("#5b6672") // secondary meta — sector, dates, blurbs

// ---- Page / type / paragraph / lists ----------------------------------------
#set page(
  paper: "us-letter",
  margin: (x: 0.5in, top: 0.7in, bottom: 0.55in),
  footer: context align(right, text(size: 8pt, fill: muted, counter(page).display())),
)

#set text(font: body-font, size: 9.5pt, fill: ink, lang: "en", hyphenate: false)
#set par(leading: 0.62em, spacing: 0.72em, justify: false)
#set list(
  marker: (text(fill: accent)[•], text(fill: muted)[–]),
  body-indent: 5pt,
  indent: 0pt,
  spacing: 0.6em,
)

// ---- Links & headings -------------------------------------------------------
#show link: it => text(fill: accent, it)

#set heading(numbering: none)
// Section titles (level 1) — centered, letter-spaced, accent; no underline rule.
#show heading.where(level: 1): it => {
  v(1.3em, weak: true)
  align(center, text(weight: "bold", size: 11pt, tracking: 0.16em, fill: accent, upper(it.body)))
  v(0.95em, weak: true)
}
// Sub-section headers (level 2) — Expertise categories & Highlights blocks.
// Real headings give a correct h1 > h2 structure; kept out of the PDF outline.
#show heading.where(level: 2): set heading(bookmarked: false)
#show heading.where(level: 2): it => {
  text(weight: "bold", size: 9.5pt, tracking: 0.04em, fill: ink, upper(it.body))
  v(6pt, weak: true)
}

// ---- Helpers ----------------------------------------------------------------
// Accent text matching link styling but with no (known) target —
// company names, "Architecture Diagram", etc.
#let linkish(body) = text(fill: accent, body)

// Left rail of an Experience / Project entry — title prominent, rest muted.
#let meta(title, sector: none, org: none, date: none, blurb: none) = {
  set par(leading: 0.5em, spacing: 0.5em, justify: false)
  text(weight: "bold", style: "italic", fill: ink, title)
  if sector != none { linebreak(); text(weight: "bold", fill: muted, sector) }
  if org != none { linebreak(); text(fill: muted, org) }
  if date != none { linebreak(); text(fill: muted, date) }
  if blurb != none { v(6pt, weak: true); text(style: "italic", fill: muted, blurb) }
}

// One two-column entry: left rail + free-form body, top-aligned, page-breakable.
#let entry(left, right) = {
  block(breakable: true, width: 100%, grid(
    columns: (35%, 1fr),
    column-gutter: 18pt,
    align: top,
    left, right,
  ))
  v(12pt, weak: true)
}

// =============================================================================
// HEADER
// =============================================================================

#grid(
  columns: (1fr, auto),
  align: (left + top, right + top),
  column-gutter: 12pt,
  [
    #text(font: body-font, size: 23pt, weight: 900, fill: accent, tracking: -0.01em)[Tanjim Hossain]
    #v(5pt, weak: true)
    #text(size: 10.5pt, weight: "bold", style: "italic", fill: ink)[Contributor, Researcher and Innovator at Ālo Labs]
    #v(7pt, weak: true)
    #set par(leading: 0.5em, spacing: 0.4em)
    Linkedin.com/#link("https://linkedin.com/in/audacioustux")[audacioustux] \
    Github.com/#link("https://github.com/audacioustux")[audacioustux] \
    Upwork.com/#link("https://upwork.com/freelancers/audacioustux")[audacioustux] \
    Credly.com/#link("https://credly.com/users/audacioustux")[audacioustux]
  ],
  [
    #set par(leading: 0.5em, spacing: 0.4em)
    #link("https://audacioustux.com")[https:\/\/audacioustux.com] \
    tanjimhossain.pro\@gmail.com \
    t.me/audacioustux \
    +880 182 317 0374 \
    Dhaka, Bangladesh
  ],
)

#v(10pt, weak: true)

// =============================================================================
// SUMMARY
// =============================================================================

#par(justify: true, text(style: "italic")[
  Tanjim is a software engineer with 10+ years of polyglot full-stack programming
  and 4+ years of research experience, across software engineering, architecture and
  DevOps. He brings immediate value by reducing costs,
  complexity and time-to-delivery with next-generation approaches and
  emerging technologies. With a dynamic, problem solving, rapid value
  delivery mindset, he is keen to make instrumental contributions to future-focused
  organizations aspiring to be category leaders. He is a proactive learner, who believes
  in "Ubuntu - I am because we are".
])

// =============================================================================
// EXPERTISE
// =============================================================================

= Expertise

#let expertise = (
  ("Software Engineering", (
    "Polyglot Programming", "Programming Idioms", "Domain Modeling", "System Design",
    "Actor Model", "Capability-Based Security", "Reactive Principles & Patterns",
  )),
  ("Software Architecture", (
    "Event-Driven Architecture", "SOA (Service-Oriented Architecture)",
    "Component-based Software Engineering and Component Models",
    "Cloud-Native & Edge Architecture", "Distributed Systems",
  )),
  ("DevOps", (
    "Application Delivery, Orchestration & Remediation", "Automated CI/CD Pipelines",
    "GitOps", "Multi-Cluster Kubernetes", "System Monitoring & Tracing",
  )),
  ("Miscellaneous", (
    "Event Processing", "Service Mesh", "API Technologies", "Client-side Development",
    "In-Memory Computing", "Data-Compute Locality", "Systems Programming",
  )),
)

#grid(
  columns: (1.0fr, 1.1fr, 0.95fr, 0.95fr),
  column-gutter: 8pt,
  align: top,
  ..expertise.map(((title, items)) => {
    heading(level: 2, title)
    list(..items.map(it => [#it]))
  }),
)

// =============================================================================
// SKILLSET
// =============================================================================

= Skillset

#let skills = (
  ("Programming Language", "Scala, Rust, JavaScript, TypeScript, Java, C/C++, Elixir, Go, C#, Bash, WebAssembly, Python, PHP"),
  ("Frameworks & Libraries", "Akka, ScalaTest, Spring Boot, Micronaut, RSocket, JMH, Flink Stateful Functions, GraalVM Polyglot & Isolates, JSoniter, Axum, Actix, Tokio, Rayon, Itertools, ExpressJS, WinterCG, Sequelize, TypeORM, Ramda, XState, Apollo GraphQL, WAMR, Seastar, MiniAudio, GLFW, GoogleTest, Phoenix, Ecto, .NET Core 7, Django"),
  ("UI/UX & Client-side", "SvelteKit, TailwindCSS, PostCSS, Web Workers, OpenGL, GLSL, WPF, Vector Graphics"),
  ("DevEx", "Linux (awk, parallel, etc.), Mirrord, Tilt, Scaffold, Dev Container, Devbox, K3d, Neovim, Docker Compose, Vagrant, Git"),
  ("DevOps", "Kubernetes, KubeVela, Terraform, Pulumi, Argo, Cdk8s, GitHub Actions, Longhorn, Grafana, Knative, LXC, Docker, Verrazzano, Minio, Prometheus, Ansible, Traefik, Cilium"),
  ("Cloud and Edge", "Amazon/Google/Azure/Oracle Cloud, VMs, Containers & Kubernetes Engine, AWS (Lambda, CodePipeline, SNS, SQS, Cognito, CloudFormation, etc.), Terraform Cloud, Fly.io, Cloudflare Workers"),
  ("Data Engineering", "Flink, YugaByteDB, PlanetScale, ScyllaDB, Cassandra, PostgreSQL, Timescale, Pinot, Redis, Pravega, Kafka, Nats"),
  ("Miscellaneous Areas", "Neuromorphic Computing, Systems Science, Alan Kay's Real OOP, Inconsistency Robustness, Concurrency, Thread-Per-Core Architecture, CRDT (Conflict-free Replicated Data Type), Clustering & Sharding, CNCF Landscape Technologies, CEP (Complex Event Processing), Digital Twin, Formal Semantics, Arduino, Mentoring, Philosophy"),
)

#grid(
  columns: (1.55in, 1fr),
  row-gutter: 11pt,
  column-gutter: 10pt,
  align: (left + top, left + top),
  ..skills.map(((label, value)) => (strong(label), value)).flatten(),
)

// =============================================================================
// HIGHLIGHTS  (new page)
// =============================================================================

#pagebreak()
= Highlights

#grid(
  columns: (1fr, 1fr),
  column-gutter: 22pt,
  align: top,
  // ----- left column -----
  [
    == Programming and Software Engineering
    - *10+ years* of programming experience in many diverse ecosystems - with a mindset to actively *seek / acknowledge / understand* the underlying engineering *principles, paradigms,* approaches and their *application*
    - *Two-time National Medal Winner* in 2015 & 2016 National High School Programming Contest (NHSPC) in Senior Category, and *First Prize* winner globally in *HackHolyoke Hackathon* 2020, organized by Mount Holyoke College, USA
    - Experience in a *diverse range of software engineering disciplines* including Full-Stack Web Development, DevOps, Cloud Computing, Platform Engineering, Distributed Systems, Systems Programming
    - Developing *CompaaS* (Component-as-a-Service) Platform - a managed platform for the whole life-cycle of polyglot components, and their interconnectivity across multi-cloud --- scalable, secure and efficient
    - *Maximum leveraging* and hands-on experience on modern tools and technologies
    - *Fast learning and execution* on time-constrained tasks and projects
    - Application of *non-mainstream* but powerful ideas and approaches, that proposes unique practical values, demonstrating good technical and theoretical *understanding* of fundamental ideas and *passion* for Computer Science and Engineering
    - *Up-to-Date* to the new technology stream, but also an advocate of "*Back-to-the-Future*" approach in Computer Science & Engineering

    #v(8pt, weak: true)
    == Industry Volunteering and Contribution
    - *Founded an online community and mentored 100+ school-university students* in their journey to programming and Computer Science
    - Helped the local *Linux community* grow substantially through organizing events and workshops
  ],
  // ----- right column -----
  [
    == Research and Development
    - *3+ years* of R&D experience and contribution as a core member in *Ālo Labs*
    - Invented fundamentally important, *first-principles based computer science and software engineering concepts and methods* based on General Systems Theory, Systems Science, Logic, Philosophy and Neuromorphic Computing that have potential to bring a paradigm shift to *increase reliability, security, intelligence and reuse* in large-scale, complex, distributed software, while simultaneously *reducing cost, effort and development time,* particularly eliminating mainstream accidental complexities of software architecture, cloud and edge computing
    - Developing a *Secure-by-Design, composable software primitive* unifying general-purpose computing and *neuromorphic AI/ML*, high-concurrency Actor Model of computation, Capability-based Security and General Systems Theory that can be used to secure software components and digital assets at a fundamental level in a more powerful way than the current ACL-based paradigm
    - Developing an end-to-end, open-source, versatile, cloud-agnostic, framework-agnostic *SaaS Reference Architecture* with next-generation scalability, availability and security properties, incorporating Data Mesh, drawing from sources and sinks like Data Lakes and Data Warehouse

    #v(8pt, weak: true)
    == Technical Writing and Publishing
    - *Co-authoring* a pioneering book titled "*Next-Generation DevOps with Software Delivery Platforms and Platform Engineering*", one of the very first books on the topic, to be published in 2024 by a *global top 5 publisher* of professional tech skills books
    - #linkish[Technical Blogs & Articles]
  ],
)

// =============================================================================
// PROFESSIONAL EXPERIENCE  (new page)
// =============================================================================

#pagebreak()
= Professional Experience

#entry(
  meta(
    [Platform Engineer],
    sector: [Labor Marketplace],
    org: [#linkish[Field Nation], USA],
    date: [Dec ‘25],
    blurb: [Field Nation is the top on-site IT labor marketplace, connecting companies and skilled technicians. Easily find, dispatch, and pay techs at scale---all in one platform.],
  ),
  [
    - Planning migration to EKS and platform modernization
  ],
)

#entry(
  meta(
    [DevOps Team Lead],
    sector: [CloudOps],
    org: [#linkish[InNeed Cloud], USA],
    date: [Apr ‘25],
    blurb: [InNeed is Empowering Businesses Globally \ From AI-driven insights to cloud-native services, we unlock your digital potential.],
  ),
  [
    - Shifting existing workloads and configurations to EKS
    - Led a team of 5-10 engineers across roles, driving adoption of best practices and modernization across the organization
    - Ensured SOC2 and HIPAA compliant AWS based infrastructure for clients in FinTech and Health sector
    - Developed InNeed Software Delivery Platform - a secure, cost-effective, elastic *Landing Zone* for friction-free progressive software delivery

    *Skills*: DevOps, Platform Engineering, AWS, Azure, Team Management
  ],
)

#entry(
  meta(
    [Platform Integration and DevOps Engineer],
    sector: [EdTech SaaS],
    org: [#linkish[CodersTrust], USA],
    date: [Dec ‘23],
    blurb: [CodersTrust is a global EdTech company innovating new ways to upskill/reskill the untapped youth of emerging markets with in-demand skills so that they can join the evolving global virtual workforce and realize their full potential.],
  ),
  [
    - Built *Software Delivery Platform* (SDP) from scratch, with best-of-breed cloud-native technologies, addressing day 0 to day N concerns
      - *Networking*: Cilium for L3, L4 & L7 network policy & routing and AWS CNI replacement for EKS, Hubble for in-depth observability, with AWS Network Load Balancer (NLB). DNS records and SSL certificate generation is completely automated
      - *Security*: Following best practices for production Kubernetes environment - enforced with Kyverno, automated security scanning, alerting, and auditing tools in place. Using AWS IAM roles and EKS Pod Identity Association with least-privilege principle as needed
      - *Observability*: Grafana, Prometheus, Thanos, Promtail with Loki as primary observability stack
      - *Storage*: Block Storage (EBS), Object Storage (S3), Network File Storage (NFS) - all via direct API access or Kubernetes operators
      - *Scalability*: The EKS Cluster uses 90% of EC2 Spot instances, and scales automatically via Karpenter for node scaling, Horizontal Pod Autoscaler (HPA) & Vertical Pod Autoscaler (VPA) for Pod scaling
    - Deploy self-managed Email Marketing & Automation platform, ensuring HA, DR and Scalability --- sending *millions of emails per month*, with sales funnels, lead collection and automation
    - Deploy OpenProject, Moodle, WordPress, Continuous Load-Testing and Monitoring solutions, and many other FOSS Applications on EKS
    - Third-party *Systems Integration* using AWS Lambda

    *Skills*: DevOps, Platform Integrations, Platform Engineering

    *Technologies Used*: AWS (Lambda, SAM Accelerate, SES, SNS, SQS, EC2, CodePipeline, CodeBuild, CodeCommit, Route 53, API Gateway, SSM, Cognito, CloudWatch, CloudFront, RDS Aurora, EKS), Python, Pulumi, Cilium, Argo, Karpenter, External DNS, External Secrets, Moodle, WooCommerce, Mautic, OpenProject, etc.
  ],
)

#entry(
  meta(
    [Senior DevOps Engineer],
    sector: [E-Commerce],
    org: [#linkish[Qcoom], Bangladesh],
    date: [Apr ‘24],
    blurb: [Qcoom is an online store and marketplace for grocery & food items, fashion & lifestyle products and many more.],
  ),
  [
    - Executed a comprehensive *disaster recovery* process for an undocumented microservices architecture, successfully leading the restoration process of EKS Cluster and MongoDB Cluster following a complete system wipeout event
    - Engineered and deployed a production-grade EKS cluster, fully integrated with AWS via Pulumi, reaching operational readiness in two days
    - 85% Monthly AWS Cloud Cost reduction

    *Skills*: DevOps, Systems Design & Consultancy, Disaster Recovery, Microservice

    *Technologies Used*: AWS (EKS, RDS, ELB, etc.), Java, Bitbucket Pipeline, Helm, SOPS, Pulumi, etc.
  ],
)

#entry(
  meta(
    [SaaS Platform Engineer],
    sector: [LLM SaaS],
    org: [Clearsenses Tech Pvt Ltd, India],
    date: [Oct ‘23],
    blurb: [Clearsenses Tech is working on #link("https://arakoo.ai")[Arakoo.ai] - Serverless LLMs served with Tasty Java.],
  ),
  [
    - Building complete *FaaS platform* based on Knative - including *billing* (based on resource usage per service), *infrastructure automation* (AWS EKS, ECR, Aurora, etc.), *continuous delivery* (integrated with GitHub Apps)
    - Creating WinterCG compatible JavaScript Runtime with Wasmtime, WASI SDK, *Rust* - for *WebAssembly-as-a-Service* (WAAS) usage, targeted for LLM chains on-the-edge usage
    - *Consultancy* - on WebAssembly Ecosystem, Infra & Architectural Decisions
  ],
)

#entry(
  meta(
    [DevOps Engineer],
    sector: [Security Consulting Service],
    org: [#linkish[fnCyber, Inc.], India],
    date: [Nov ‘23],
    blurb: [fnCyber got incepted with the sole purpose to uncover vulnerabilities in any business system at the functional level combining the expertise in business continuity, cybersecurity and Integrated Risk Management; take the Cybersecurity Practice to organizational grassroots and infuse security controls with procedural awareness transforming enterprises as they go Cyber Resilient - Functionally.],
  ),
  [
    - Migrating to AWS EKS from multiple EC2 instances
    - Automating infrastructure provisioning using Terraform and managing the platform with Argo CD
    - Implementing automation for security scanning tools using Argo Workflows on top of EKS (with Autoscaler) and EFS
    - Developing APIs to interact with the workflow engine, written in Rust
    - Archiving scan reports to an AWS S3 bucket and sending signed URLs to the designated target email address
  ],
)

#entry(
  meta(
    [Technology Consultant],
    sector: [Technology Strategy, Solutions and Staffing],
    org: [#linkish[Sourcēvo], Bangladesh],
    date: [Mar ‘23],
    blurb: [Sourcēvo helps future-focused organizations aspiring to become category leaders through technology innovation.],
  ),
  [
    - *Potential Investee Assessments for Silicon Valley Venture Capital (VC) Firms*
      - The maturity and trajectory of the WebAssembly ecosystem as of 2023
      - Assessment, comparison, and evaluation of WebAssembly PaaS/SaaS ideas, architecture, and business value
      - Evaluation of Emerging Database-as-a-Service (DBaaS) and Platform-as-a-Service (PaaS) Providers
      - Evaluation of Emerging Edge FaaS Technologies
  ],
)

#entry(
  meta(
    [DevOps Presales Engineer],
    sector: [Fortune 500 Systems Integrator],
    org: [#linkish[UTC Associates, Inc.], USA],
    date: [Jul ‘23],
    blurb: [UTC is a leading technology consulting, systems integration, staffing, business solutions and services company, established in 2001, with both Fortune 500 and public sector clients like AT&T, Verizon, MetTel, Deutsche Bank, Barclays, Dow Jones, IBM, Microsoft, Dell, Viacom, Con Edison, PSEG, various New York State agencies, etc.],
  ),
  [
    - Technical presales for *Consolidated Edison (ConEd),* a *Fortune 300* in Utilities Industry,
      - Getting architecture proposals shortlisted to top-five in competitive bids, for *Technology Modernization - DevOps*, a multi-million dollar, multi-year project competing with 15+ global IT giants
      - *Assessment* of ConEd development practices, applications and deployment models, and *Planning* a detailed DevOps implementation that aligns with their business objectives
      - Selecting the *best of Suite* and Hybrid set of *tools in CI/CD and SDP* category, and assessing the integration and migration strategies - that meets the infrastructure & application needs, security, and compliance requirements

    *Skills*: Presales, Request for Proposal (RFP), DevOps
  ],
)

#entry(
  meta(
    [Software Engineer],
    sector: [EdTech SaaS],
    org: [#linkish[CodersTrust], USA],
    date: [Feb ‘23],
  ),
  [
    - *CodersTrust.Global*, The new revamped website of CodersTrust
    - *JobReady*, a Job Portal / Marketplace - a new offering from CodersTrust, where employers can discover and hire part-time/full-time remote talents globally

    *Technologies Used*: PHP, PlanetScale, Fly.io, AWS Route 53, CodeCommit, Elementor, WordPress, Hostinger etc.
  ],
)

#entry(
  meta(
    [Researcher - Applied Innovations],
    sector: [R&D Lab focused on Scalable Reliability, Security & Reuse for Enterprise, SaaS and Mobile Apps],
    org: [#linkish[Ālo Labs], Australia],
    date: [Oct ‘20],
    blurb: [Ālo Labs is a non-profit, community-driven, first-principles research lab creating groundbreaking open-source tech, on a mission to cut 10x the cost, complexity and effort of building and operating complex, large-scale, distributed software --- by leveraging under-used concepts from the last 100 years of Systems Science, Computer Science, Systems Engineering and Software Engineering.],
  ),
  [
    - *Ālo OS*, a truly next-generation, universally deployable "overlay OS" (Single System Image - Distributed OS) that can launch maximally reusable, mobile, intelligent, polyglot "nanoservice agents" 1000x faster than any alternatives (e.g., FaaS), hosting up to 5M in-memory agents serving 5M standard microservice-class calls equivalent event-reactions/sec concurrently on ordinary \$60/month VM instances, scaling from IoT & user devices incl browsers to Edge & Cloud. Runs WebAssembly on any device
    - *Fluid Computing*, a new compute paradigm that unifies multi-cloud IaaS, CaaS, FaaS, CDNs, edge, user device, IoT and decentralized infra in a single system image compute substrate that abstracts away distributed computing complexity, provides autoscaling, process offloading & migration and ensures maximal data locality through dynamic provisioning and orchestration
    - *Bloom*, a high-level microkernel, that runs on cloud, edge, user devices, IoT and decentralized infra, unifies the OS concept of process with systems-theoretic agents, provides eventing-based IPC and a distributed state store-backed virtual memory. Bloom also introduces the concept of "exo-processes" and can drive remote processes in any remote compute infra, e.g., FaaS, CaaS and Kubernetes-based containerized processes. Bloom also acts as a Virtual Kubelet for Kubernetes and is compatible with Knative API. Also provides a WebAssembly WASI-like systems API.
    - *ĀloScript*, a PITL (Programming-in-the-Large) scripting language on top of Scala, that brings Smalltalk-like expressiveness and productivity to distributed applications programming powered by a meta-recursive, self-describing primitive and language kernel based on the Systems Model of Computation developed at Ālo
    - *Crux*, a cross-platform, reactive UX framework that reifies UX-level primitives that are currently neglected in typical UI frameworks and provides a reusable single-effort UX substrate for apps to drive UI of different devices

    *Technologies Used*: Java, Scala, Dart, Rust, JavaScript, Erlang, Elixir, NodeJS, Deno, GraalVM, SubstrateVM, Erlang OTP & BEAM, WebAssembly, Akka, Akka Streams, AkkaJS, Flink, Pravega, Kafka, Flutter, Kubernetes, Knative, AWS, GCP, Azure Cloud, Oracle Cloud, etc.
  ],
)

#entry(
  meta(
    [Researcher - Theoretical Advancements],
    org: [#linkish[Ālo Labs], Australia],
    date: [Jun ‘20],
  ),
  [
    - *STEPS (Systems-Theoretic Engineering Paradigm for Software)*, a powerful new paradigm that unifies the most powerful yet neglected concepts of Systems Science and Computer Science that caters to the changed needs of modern distributed software
    - *Systems Model of Computation*, a fundamental model of computation that improves upon and unifies Lambda Calculus, Lisp Model, Actor Model and Alan Kay's Object-Orientation, radically simplifying modern computing needs and is based on the mathematical foundations of Systems Science
    - *SODA (Semantics-Oriented Development Approach)*, a powerful semantic approach to software reuse and component-based development that unifies Philosophy, Systems Science, Logic, Lambda Calculus and Type Theory with denotational, axiomatic and interaction semantics, resulting in maximized reuse, quality and security - all centered around the well-established concept of Term (as in Logic, Lambda Calculus and Mathematics)
    - *SeMA (Semantic Modeling & Analysis)*, a domain modeling method for applying SODA using STEPS, that completely eliminates the cognitive impedance mismatch between an analysis model vs design model vs solution model vs programming model vs computational model vs deployment model, leading to unprecedented TTM (Time-to-Market) of features while maximizing developer independence & ownership of a feature
    - *Semantic Containers*, a novel ultra-lightweight, semantics-based security isolation method for isolating untrusted components/agents that provides semantic guarantees and is an additional sandboxed container above and beyond capability-based security, language-based isolation, VM Isolates-based isolation and more conventional container-based isolation
    - *Alpha Architecture*, which improves over Kappa and Lambda Architectures of distributed applications and unifies the currently heterogeneous OLTP, OLAP, ML and AI architectural approaches with an end-to-end homogeneous, agent primitive-based architecture
  ],
)

#entry(
  meta(
    [Full-Stack Web Developer],
    org: [#linkish[NobinAlo], Bangladesh],
    date: [Jun ‘17],
    blurb: [NobinAlo is a non-profit EdTech startup providing free, high-quality digital learning resources to under-resourced students.],
  ),
  [
    - Use Google APIs, Django (later Express.js, GraphQL) to build a Learning Portal with free resources
    - Containerize and deploy on Kubernetes
  ],
)

// =============================================================================
// EDUCATION + VOLUNTEER ACTIVITIES  (new page)
// =============================================================================

#pagebreak()
= Education

#text(weight: "bold")[#linkish[American International University - Bangladesh]]
#v(8pt, weak: true)
#grid(
  columns: (1fr, auto),
  column-gutter: 12pt,
  [Bachelor of Science (Honors), Computer Science and Engineering],
  text(weight: "bold")[148 credits],
)

#v(14pt, weak: true)
= Volunteer Activities

#grid(
  columns: (1fr, 1fr),
  column-gutter: 22pt,
  align: top,
  [
    *Bangladesh Linux Users Alliance and Ubuntu* #text(fill: muted)[(2012 - ‘16)] \
    Assisted thousands of individuals in resolving their Linux-related issues for both production and personal use cases. Additionally, organized numerous physical events as part of the Open-Source Software Movement.

    #link("https://wiki.ubuntu.com/tanjim")[https:\/\/wiki.ubuntu.com/tanjim]
  ],
  [
    *NobinAlo Programming Community* #text(fill: muted)[(2019 - present)] \
    Initially established as a small community to support friends and university juniors in embarking on their Software Engineering journey. Over time, it grew into a community boasting over 200 highly enthusiastic members. Conducted weekly sessions that concentrated on fundamental software engineering topics, accompanied by the assignment of tasks for the upcoming week.

    #link("https://github.com/audacioustux/npc_discord_archieve")[https:\/\/github.com/audacioustux/npc_discord_archieve]
  ],
)

// =============================================================================
// PROJECT EXPERIENCE  (new page)
// =============================================================================

#pagebreak()
= Project Experience

#entry(
  meta(
    [k8swalski],
    org: [NobinAlo],
    date: [Initiated - Jan ‘26],
    blurb: [HTTP/HTTPS echo server for debugging and testing Kubernetes applications, webhooks, and API clients.],
  ),
  [
    - *Technologies Used*: Rust, Nix
    - *Link*: #link("https://github.com/nobinalo/k8swalski")[https:\/\/github.com/nobinalo/k8swalski]
  ],
)

#entry(
  meta(
    [Azure Landing Zone \[Plan\]],
    date: [Initiated - May ‘25],
    blurb: [Landing Zone plan on Azure for an Education Institute],
  ),
  [
    - *Link*: #linkish[Architecture Diagram]
  ],
)

#entry(
  meta(
    [AWS SDP],
    date: [Initiated - Jun ‘24],
    blurb: [Software Delivery Platform on AWS with EKS and Cloud-Native technologies and approaches],
  ),
  [
    - *Link*: #linkish[Architecture Diagram]
  ],
)

#entry(
  meta(
    [Scan Automate],
    org: [fnCyber Security Consulting Services Pvt Ltd],
    date: [Initiated - Oct ‘23],
    blurb: [Automated Security Scanning Workflow],
  ),
  [
    - Automate security scanning tools (e.g., rustscan, zap, openvas etc.) with a simple HTTP API
    - Orchestrate the scanners, collect the logs, create a PDF, store to S3, send the signed URL of the result to an email address
    - *Technologies Used*: Rust, Argo, Kubernetes, AWS EKS, EFS, S3, Cluster Autoscaler, Terraform, Axum
    - *Link*: #link("https://github.com/audacioustux/scan-automate")[https:\/\/github.com/audacioustux/scan-automate]
  ],
)

#entry(
  meta(
    [WasmJS],
    org: [Clearsenses Tech],
    date: [Initiated - Oct ‘23],
    blurb: [A runtime / engine for ECMAScript and tailored to be compatible with WinterCG Standard - that runs on top of Wasmtime + QuickJS],
  ),
  [
    - Use QuickJS as JavaScript engine, compiled to WASM, run on top of Wasmtime
    - Make WinterCG compatible frameworks (e.g., Hono) work inside WASM, with necessary WASI bindings
    - *Technologies Used*: WebAssembly, Rust, WinterCG, JavaScript, Wasmtime, WASI
    - *Link*: #link("https://github.com/audacioustux/wasmjs")[https:\/\/github.com/audacioustux/wasmjs]
  ],
)

#entry(
  meta(
    [SDP AWS],
    org: [CodersTrust, USA],
    date: [Initiated - Sep ‘23],
    blurb: [An end-to-end cohesive Software Delivery Platform (SDP), that strives to be Cloud-Native, highly configurable, ready for multi-cloud and hybrid environments],
  ),
  [
    - Building a platform that hides Kubernetes complexities from the end-users and packages open-source tools for purposes like, High Availability (HA), Disaster Recovery (DR), Networking, CI/CD Automation, Observability, Scalability, Security, Testing, Cost Optimization and more - with Kubernetes Operators
    - Exhaustive analysis of open-source tools and technologies in CNCF Landscape to find the right suite of tools
    - Finding out the best approach to provision and bootstrap infrastructure & platform - from the ground-up, and scale-out
    - *Technologies Used*: Kubernetes, Pulumi, TypeScript, Cilium, Argo, Thanos, and many other from CNCF Landscape
    - *Link*: #link("https://github.com/audacioustux/sdp-aws")[https:\/\/github.com/audacioustux/sdp-aws]
  ],
)

#entry(
  meta(
    [Bloom],
    org: [Ālo Labs],
    date: [Initiated - Jun ‘21],
    blurb: [Component Scheduler on top of GraalVM and Akka],
  ),
  [
    - Benchmarking
      - Graal WASM/JS/Python/Espresso throughput and memory usage
      - Akka Actor Scheduling Perf and Memory usage per Actor
      - Lunatic, Wasmtime, Wasmer, WAMR
    - Evaluate Graal Polyglot API and Isolates Capabilities
    - Compare Akka and Flink Statefun in terms of Scalability
    - Schedule polyglot components as Akka Actors
    - *Technologies Used*: Scala, Java, Rust, Akka, GraalVM, JMH, Jcmd, VisualVM
    - *Link*: #link("https://github.com/audacioustux/alo-pocs")[https:\/\/github.com/audacioustux/alo-pocs]
  ],
)
