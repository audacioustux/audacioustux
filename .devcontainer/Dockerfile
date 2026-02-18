# Base image: Ubuntu 24.04 (Noble)
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# --- Phase 1: Root Operations ---
# Install Nix dependencies
RUN apt-get update && apt-get install -y xz-utils
RUN rm -rf /var/lib/apt/lists/*

# 1. Prepare /nix directory for single-user install
RUN mkdir -m 0755 /nix
RUN chown vscode:vscode /nix

# --- Phase 2: User Operations ---
# Switch to non-root user
USER vscode
ENV USER=vscode
ENV HOME=/home/vscode

# 2. Enable Flakes for user (required for build & VS Code)
RUN mkdir -p ~/.config/nix && cat <<EOF >> ~/.config/nix/nix.conf
experimental-features = nix-command flakes
download-buffer-size = 536870912 # 512MB
auto-optimise-store = true
EOF

# 3. Install Nix (Single-User, no daemon)
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

# Add Nix to PATH for subsequent steps
ENV PATH="/home/vscode/.nix-profile/bin:$PATH"
ENV NIX_SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# --- Phase 3: Environment Installation ---
WORKDIR /tmp/build

# 4. Copy context (preserve structure for env.nix resolution)
COPY --chown=vscode:vscode flake.nix flake.lock ./
COPY --chown=vscode:vscode .devcontainer/env.nix .devcontainer/

# 5. Install environment (build flake & install packages)
RUN nix profile install --impure --accept-flake-config --file .devcontainer/env.nix

# 6. Cleanup
WORKDIR /
RUN rm -rf /tmp/build

# 7. Persist PATH for interactive shell
ENV PATH="/home/vscode/.nix-profile/bin:$PATH"
