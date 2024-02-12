#!/bin/bash

#RG_PREFIX="rg --column --line-number --no-heading --color=always --ignore-case ${RG_OPTIONS} "
RG_PREFIX="python3 ${PYTHON_SCRIPT} "

INITIAL_QUERY="${*:-}"

# Switch between Ripgrep mode and fzf filtering mode (CTRL-T)
: | fzf -i --ansi --disabled ${FZF_OPTIONS} --query "$INITIAL_QUERY" \
    --bind "start:reload($RG_PREFIX {q})+transform:echo \"unbind(change)+change-prompt(2. fzf> )+enable-search+transform-query:echo \{q} > ${FILE_RG}; cat ${FILE_FZF}\"" \
    --bind "change:reload:sleep 0.1; $RG_PREFIX {q} || true" \
    --bind 'ctrl-t:transform:[[ ! $FZF_PROMPT =~ ripgrep ]] &&
      echo "rebind(change)+change-prompt(1. ripgrep> )+disable-search+transform-query:echo \{q} > ${FILE_FZF}; cat ${FILE_RG}" ||
      echo "unbind(change)+change-prompt(2. fzf> )+enable-search+transform-query:echo \{q} > ${FILE_RG}; cat ${FILE_FZF}"' \
    --color "hl:#0000FF:underline,hl+:#0000FF:underline:reverse" \
    --prompt '1. ripgrep> ' \
    --delimiter : \
    --header 'CTRL-T: Switch between ripgrep/fzf' \
    --preview 'if [[ -z {2} ]]; then; bat --color=always {1}; else; bat --color=always {1} --highlight-line {2}; fi' \
    --preview-window 'up:50%:wrap:border-bottom:+{2}+3/3:~3' \
    --bind 'ctrl-/:change-preview-window(50%|hidden|)' \
    --bind 'enter:execute-silent(echo "{1}:{2}:{3}" | xargs code --goto)'