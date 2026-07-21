# Oh My Zsh Configuration
export ZSH="$HOME/.oh-my-zsh"
export EDITOR="${EDITOR:-code}"

# Theme
ZSH_THEME="robbyrussell"

# Plugins
plugins=(
    git
    zoxide
    direnv
    rust
    zsh-autosuggestions
    zsh-syntax-highlighting
)

# Load Oh My Zsh
source $ZSH/oh-my-zsh.sh

# Activate mise for interactive devcontainer shells.
eval "$(mise activate zsh)"

# Authenticate GitHub API callers such as `mise upgrade --bump` when `gh` is logged in.
(( $+commands[gh] )) && export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token 2>/dev/null)}"

[[ -r ~/.local.zshrc ]] && source ~/.local.zshrc
