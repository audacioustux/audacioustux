{
  system ? builtins.currentSystem,
}:

let
  pkgs = import <nixpkgs> { inherit system; };

  # Fetch flake-compat (Standard Nix, no experimental features needed)
  flakeCompat = fetchTarball "https://github.com/NixOS/flake-compat/archive/master.tar.gz";

  # Load the flake
  flake = (import flakeCompat { src = ../.; }).defaultNix;

  # Read the explicit dependency list from flake.nix
  allDeps = flake.containerDependencies.${system};
in
# Build the environment
pkgs.buildEnv {
  name = "dev-container-env";
  paths = allDeps;
  ignoreCollisions = true;
}
