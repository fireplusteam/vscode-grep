#!/bin/bash

#rm -f /tmp/rg-fzf-{r,f}

#RG_PREFIX="rg --column --line-number --no-heading --color=always -i "
RG_PREFIX="python3 resources/interactive_cmd.py "
INITIAL_QUERY="${*:-}"

# Switch between Ripgrep mode and fzf filtering mode (CTRL-T)
: | fzf -i --ansi --disabled --query "$INITIAL_QUERY" \
    --bind "start:reload($RG_PREFIX {q})+transform:python3 resources/transform.py {q} /tmp/rg-fzf-r /tmp/rg-fzf-f" \
    --bind "change:reload:sleep 0.1; $RG_PREFIX {q} || true" \
    --bind "ctrl-t:transform(python3 resources/transform.py {q} /tmp/rg-fzf-r /tmp/rg-fzf-f)" \
    --color "hl:#0000FF:underline,hl+:#0000FF:underline:reverse" \
    --prompt '1. ripgrep> ' \
    --delimiter : \
    --header 'CTRL-T: Switch between ripgrep/fzf' \
    --preview 'if [[ -z {2} ]]; then; bat --color=always {1}; else; bat --color=always {1} --highlight-line {2}; fi' \
    --preview-window 'up:50%:wrap:border-bottom:+{2}+3/3:~3' \
    --bind 'ctrl-/:change-preview-window(50%|hidden|)' \
    --bind 'enter:execute-silent(echo "{1}:{2}:{3}" | xargs code --goto)'