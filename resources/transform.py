import sys
import os
import dump_q

if __name__ == "__main__":
    current_promt = os.getenv("FZF_PROMPT")
    query = sys.argv[1]

    file_rip = sys.argv[2]
    file_fzf = sys.argv[3]

    if "ripgrep" in current_promt: # change to fzf
        dump_q.dump(query, file_rip)
        print(f"unbind(change)+change-prompt(2. fzf> )+enable-search+transform-query:cat {file_fzf}")
    else: # change to ripgrep
        dump_q.dump(query, file_fzf)
        print(f"rebind(change)+change-prompt(1. ripgrep> )+disable-search+transform-query:cat {file_rip}")