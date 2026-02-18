{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # --- Package List ---
        # Customize this list for your project
        devPackages = with pkgs; [
          # Core Shell Tools
          zsh
          direnv
          git
          gh
          go-task
          jq
          yq-go
          ripgrep
          fd
          eza
          bat
          zoxide
          fzf

          # Editor
          neovim

          # Nix Tooling
          nixd
          nixfmt-rfc-style

          # Languages (uncomment as needed)
          # nodejs_22
          # bun
          # python311
          # rustc
          # cargo
          # go

          # Utilities
          curl
          wget
          tree
          moreutils
          pre-commit
          typst
          figlet
          lolcat
        ];
      in
      {
        # Development Shell (nix develop)
        devShells.default = pkgs.mkShell {
          packages = devPackages;
          shellHook = ''
            figlet "DevEnv" | lolcat
          '';
        };

        # Export for Container (env.nix)
        containerDependencies = devPackages;
      }
    );
}
