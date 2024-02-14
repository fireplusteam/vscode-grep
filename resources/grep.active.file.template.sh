#!/bin/bash

RG_PREFIX="python3 '${PYTHON_SCRIPT}' "

INITIAL_QUERY=$(echo -n "$1" | base64 -d)

echo "$INITIAL_QUERY" > "${FILE_RG}"
RELOAD="$RG_PREFIX \"-fileRELOADING_OPTION ${FILE_RG}\""

# Switch between Ripgrep mode and fzf filtering mode (CTRL-T)
: | fzf -i --ansi --disabled ${FZF_OPTIONS} --query "$INITIAL_QUERY" \
    --bind "start:reload($RG_PREFIX {q})+transform:echo \"unbind(change)+change-prompt(2. fzf> )+enable-search+transform-query:echo \{q} > ${FILE_RG}; cat ${FILE_FZF}\"" \
    --bind "change:execute-silent(python3 '${PYTHON_DUMP_SCRIPT}' {q} ${FILE_RG} ${FILE_FZF})+reload:sleep 0.1; $RG_PREFIX {q} || true" \
    --bind "ctrl-r:reload:$RELOAD" \
    --bind "ctrl-t:transform(python3 '${PYTHON_TRANSFORM_SCRIPT}' {q} ${FILE_RG} ${FILE_FZF})" \
    --color "hl:#0000FF:underline,hl+:#0000FF:underline:reverse" \
    --prompt '1. ripgrep> ' \
    --delimiter : \
    --header 'CTRL-T: Switch between ripgrep/fzf | CTRL-R to refresh the list | CTRL-/ to show/hide preview' \
    --preview "bat --color=always \"${PREVIEW_FILE}\" --highlight-line {1}" \
    --preview-window 'up:50%:wrap:border-bottom:+{1}+3/3:~3' \
    --bind 'ctrl-/:change-preview-window(50%|hidden|)' \
    --bind 'enter:execute-silent(echo "${PREVIEW_FILE}:{1}:{2}" | xargs code --goto)'