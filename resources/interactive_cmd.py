import fcntl
import sys
import subprocess
import os
import time

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
        
    #print(f"QUIERY: {query}")
    rg = f"rg --column --line-number --no-heading --color=always --ignore-case {query}"
    if len(query) == 0:
        print_help(rg)
        exit(0)
    process = subprocess.Popen(rg, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    # Set output to non-blocking
    flags = fcntl.fcntl(process.stdout, fcntl.F_GETFL) # first get current process.stdout flags
    fcntl.fcntl(process.stdout, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    is_ok = False 
    #print(process.stdout)
    while True:
        try:
            output = process.stdout.buffer.read()
        except OSError:
            time.sleep(0.05) # wait a short period of time then try again
            continue
        
        if output == b'' and process.poll() is not None:
            break
        if output:
            is_ok = True
            sys.stdout.buffer.write(output)
            
    if not is_ok:
        print("Error: " + process.stderr.read())
        print_help(rg)
        
except Exception as e:
    print("EXCEPTION_OF_RUNNING: " + str(e))
