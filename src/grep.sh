#!/bin/bash

rm -f /tmp/rg-fzf-{r,f}

RG_PREFIX="rg --column --line-number --no-heading --color=always --smart-case "

INITIAL_QUERY="${*:-}"

: | fzf -i -e --ansi --disabled --query "$INITIAL_QUERY" \
    --height 100% \
    --bind "start:reload($RG_PREFIX {q})+unbind(ctrl-r)" \
    --bind "change:reload:sleep 0.1; $RG_PREFIX {q} || true" \
    --bind "ctrl-f:unbind(change,ctrl-f)+change-prompt(2. fzf> )+enable-search+rebind(ctrl-r)+transform-query(echo {q} > /tmp/rg-fzf-r; cat /tmp/rg-fzf-f)" \
    --bind "ctrl-r:unbind(ctrl-r)+change-prompt(1. ripgrep> )+disable-search+reload($RG_PREFIX {q} || true)+rebind(change,ctrl-f)+transform-query(echo {q} > /tmp/rg-fzf-f; cat /tmp/rg-fzf-r)" \
    --color "hl:-1:underline,hl+:-1:underline:reverse" \
    --prompt '1. ripgrep> ' \
    --delimiter : \
    --header '╱ CTRL-R (ripgrep mode) ╱ CTRL-F (fzf mode) ╱' \
    --preview 'bat --color=always {1} --highlight-line {2}' \
    --preview-window 'up,40%,border-bottom,+{2}+3/3,~3' \
    --bind 'enter:execute-silent(echo "{1}:{2}:{3}" | xargs code --goto)'

