import sys
import os

def dump(q, file_name):
    os.makedirs(os.path.dirname(file_name), exist_ok=True)
    with open(file_name, "w+") as file:
        file.write(q)

def read_query(file_name):
    try:
        with open(file_name, "r+") as file: 
            return file.read()
    except:
        return ""

if __name__ == "__main__":
    query = sys.argv[1]

    file_rip = sys.argv[2]
    file_fzf = sys.argv[3]

    if "ripgrep" in current_promt: # change to fzf
        dump(query, file_rip)
    else: # change to ripgrep
        dump(query, file_fzf)
    