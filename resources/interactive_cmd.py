import sys
import subprocess

def print_help(query):
    print(f"Query: {query}")
    help = """Search Result is Empty: Fix it with Examples:
        --files -g '*.swift' => Display files applied with glob
        -uu --files -g '**/ios/**/*.{swift,md}' -g '!**/.git/**' => complex glob request
        -g '*.swift' -g '!Folder/**' 'Some Regular Expression' => Regular Expression using glob
        '' => Feed with all content
    """
    print(help)
    
try:
    if sys.argv[1].startswith('-fileRELOADING_OPTION'):
        try:
            file_name = sys.argv[1].removeprefix("-fileRELOADING_OPTION ").rstrip("\"")
            with open(file_name, 'r+') as file:
                query = file.readline().rstrip("\n")
        except Exception as e:
            print(f"EXCEPTION while reloading with CTRL+R {str(e)}")
    else:
        # query
        query = sys.argv[1]
        
    print(f"QUIERY: {query}")
    rg = f"rg --column --line-number --no-heading --color=always --ignore-case {query}"
    if len(query) == 0:
        print_help(rg)
        exit(0)
    process = subprocess.Popen(rg, shell=True, stdout=subprocess.PIPE, text=True)
    is_ok = False 
    while True:
        str = process.stdout.readline()
        if not str:
            break
        is_ok = True
        print(str, end='')    
    if not is_ok:
        print_help(rg)
except Exception as e:
    print(str(e))
