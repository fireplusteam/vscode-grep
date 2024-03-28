import fcntl
import sys
import subprocess
import os
import time
import base64

def print_help(query):
    print(f"Query: {query}")
    help = """Search Result is Empty: Fix it with Examples:
        --files -g '*.swift' => Display files applied with glob
        -uu --files -g '**/ios/**/*.{swift,md}' -g '!**/.git/**' => complex glob request
        -g '*.swift' -g '!Folder/**' 'Some Regular Expression' => Regular Expression using glob
        '' => Feed with all content
    """
    print(help)
    
    
def run_process(rg: str):
    process = subprocess.Popen(rg, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    # Set output to non-blocking
    flags = fcntl.fcntl(process.stdout, fcntl.F_GETFL) # first get current process.stdout flags
    fcntl.fcntl(process.stdout, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    is_ok = False 
    while True:
        try:
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
        except:
            time.sleep(0.05)

    return process,is_ok


try:
    user_input = sys.argv[2]
    input = base64.b64decode(sys.argv[1].encode('utf-8')).decode('utf-8')
    
    if user_input.startswith('-fileRELOADING_OPTION'):
        try:
            file_name = user_input.removeprefix("-fileRELOADING_OPTION ").rstrip("\"")
            with open(file_name, 'r+') as file:
                query = file.readline().rstrip("\n")
        except Exception as e:
            print(f"EXCEPTION while reloading with CTRL+R {str(e)}")
    else:
        # query
        query = user_input
    
    if '--files' in input:
        awk = "awk -F/ '{ filename=$NF; path=\"\"; for(i=1; i<NF; i++) path=path $i FS; print filename \" ~~> \" path }'"; 
        query = f"{query} | {awk}"
    
    base_command = "rg --column --line-number --no-heading --color=always --ignore-case"
    rg = f"{base_command} {input} {query} "
    print(f"QUIERY: {input} {query} ")
           
    process, is_ok = run_process(rg)
            
    if not is_ok:
        rg = f"{base_command} {input} '' {query} "
        process, is_ok = run_process(rg)
        
        if not is_ok:
            print("Error: " + process.stderr.read())
            print_help(rg)
        
except Exception as e:
    print("EXCEPTION_OF_RUNNING: " + str(e))
