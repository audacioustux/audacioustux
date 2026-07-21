{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      nixpkgs-unstable,
      flake-utils,
      rust-overlay,
      git-hooks,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            rust-overlay.overlays.default
          ];
        };

        unstable = import nixpkgs-unstable {
          inherit system;
        };

        # Font config for plantuml:
        #   pkgs.liberation_ttf  → family "Liberation Sans"
        #   pkgs.jetbrains-mono  → family "JetBrains Mono"
        #
        #   Liberation Sans (Arial-class proportional) is the default diagram
        #   font. Java AWT's built-in SansSerif metrics map to Liberation Sans
        #   on Linux, so SVG textLength values are accurate and text always
        #   fits boxes. Minimal GPOS — designed for metric compatibility, not
        #   feature typography — means Java and browser measurements agree.
        #   JetBrains Mono is used as defaultMonospacedFontName so that code
        #   references in diagram labels (e.g. Rust attribute syntax) render in
        #   a proper monospace face.
        # Fonts are passed to Java via FONTCONFIG_FILE so all plantuml render
        # invocations see them regardless of system font cache state.
        # No JAVA_TOOL_OPTIONS override is needed.
        plantumlFontsConf = pkgs.makeFontsConf {
          fontDirectories = [
            pkgs.liberation_ttf
            pkgs.jetbrains-mono
          ];
        };

        # Canonical render hook: sets FONTCONFIG_FILE so Liberation Sans and
        # JetBrains Mono are available to PlantUML's Java font engine.  Diagrams are
        # self-contained — all
        # skinparam and style settings live in each .puml file and are enforced
        # softly via the diagramming convention docs.
        plantumlRender = pkgs.writeShellScriptBin "plantuml-render" ''
          set -euo pipefail
          export FONTCONFIG_FILE="${plantumlFontsConf}"
          exec ${pkgs.plantuml}/bin/plantuml --check-before-run --no-error-image --stop-on-error --svg "$@"
        '';

        rustToolchain = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;

        gitHooksCheck = git-hooks.lib.${system}.run {
          src = ./.;
          default_stages = [ "pre-push" ];
          tools = {
            rustfmt = rustToolchain;
            clippy = rustToolchain;
            cargo = rustToolchain;
          };
          hooks = {
            rustfmt = {
              enable = true;
              pass_filenames = true;
            };
            clippy = {
              enable = true;
              settings.allFeatures = true;
            };
            nixfmt.enable = true;
            plantuml-render = {
              enable = true;
              name = "plantuml";
              entry = "${plantumlRender}/bin/plantuml-render";
              files = "\\.puml$";
              pass_filenames = true;
              language = "system";
              stages = [ "pre-commit" ];
            };
          };
        };

        npxCliWrap = pkg: cmd: pkgs.writeShellScriptBin pkg ''exec npx --yes ${cmd} "$@"'';

        cliAgentsWrappers = [
          (npxCliWrap "omx" "oh-my-codex")
          (npxCliWrap "qwen" "@qwen-code/qwen-code")
          (npxCliWrap "codex" "@openai/codex")
          (npxCliWrap "claude" "@anthropic-ai/claude-code")
          (npxCliWrap "pi" "@earendil-works/pi-coding-agent")
        ];

        ohMyZshPlugins = with pkgs; [
          zsh-autosuggestions
          zsh-syntax-highlighting
        ];

        devShellPackages =
          (with pkgs; [
            rustup
            python3
            python311
            cargo-watch
            cargo-nextest
            direnv
            go-task
            neovim
            parallel
            nodejs
            uv
            gum
            glow
            gnuplot
            cloudflared
            bubblewrap
            git
            gh
            curl
            unstable.docker-client
            jq
            ripgrep
            fd
            bat
            eza
            htop
            tokei
            zoxide
            nixfmt
            opencode
            zellij
            tmux
            rust-analyzer
            nixd
            perf
            cargo-flamegraph
            heaptrack
            plantuml
            chromium
            liberation_ttf
            plantumlRender
            gost
            bun
            pm2
            mise
            redis
            vhs
            flyctl
          ])
          ++ ohMyZshPlugins
          ++ [ unstable.deno ]
          ++ cliAgentsWrappers;

        # ── Shell hooks (composed) ────────────────────────────────────────────────
        npmGlobalHook = ''
          export NPM_CONFIG_PREFIX="$HOME/.npm-global"
          export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
          mkdir -p "$NPM_CONFIG_PREFIX"
        '';

        gitHooksHook = gitHooksCheck.shellHook;

        ohMyZshHook = with pkgs; ''
          mkdir -p ~/.oh-my-zsh/custom/plugins
          ln -sfn ${zsh-autosuggestions}/share/zsh-autosuggestions ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions
          ln -sfn ${zsh-syntax-highlighting}/share/zsh-syntax-highlighting ~/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting
        '';

        shellHook = ''
          unset name
          ${npmGlobalHook}
          ${gitHooksHook}
          ${ohMyZshHook}
        '';

      in
      {
        checks.git-hooks-check = gitHooksCheck;
        devShells.default = pkgs.mkShell {
          packages = devShellPackages;
          inherit shellHook;
        };
      }
    );
}
