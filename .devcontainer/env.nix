{
  system ? builtins.currentSystem,
}:

let
  pkgs = import <nixpkgs> { inherit system; };

  flakeCompat = fetchTarball "https://github.com/NixOS/flake-compat/archive/master.tar.gz";
  flake = (import flakeCompat { src = ../.; }).defaultNix;

  # Get packages from the default devShell
  allDeps =
    (flake.devShells.${system}.default.buildInputs or [ ])
    ++ (flake.devShells.${system}.default.nativeBuildInputs or [ ]);
in
pkgs.buildEnv {
  name = "devcontainer";
  paths = allDeps;
  ignoreCollisions = true;
}
