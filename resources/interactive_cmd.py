import sys
import subprocess

def print_help(query):
    print(f"Query: {query}")
    help = """Search Result is Empty: Fix it with Examples:
        --files -g '*.swift' => Display files applied with glob
        -g '*.swift' -g '!Folder/**' 'Some Regular Expression' => Regular Expression using glob
        '' => Feed with all content
    """
    print(help)
    
try:
    query = sys.argv[1]
    rg = f"rg --column --line-number --no-heading --color=always -i {query}"
    if len(query) == 0:
        print_help(rg)
        exit(0)
    process = subprocess.run(rg, shell=True, capture_output=True, text=True)
    print(process.stdout)
    if len(process.stdout) == 0:
        print_help(rg)
except Exception as e:
    print(str(e))
