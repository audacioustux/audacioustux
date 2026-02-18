# Path to Oh My Zsh installation (managed by devcontainer feature)
export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

plugins=(
    git 
    zoxide 
    direnv
)

source $ZSH/oh-my-zsh.sh
