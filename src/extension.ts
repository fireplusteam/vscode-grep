'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
const TERMINAL_NAME = 'grep';
let customTerminal: vscode.Terminal | null = null;

function findTerminal(name: string) {
  return (
    vscode.window.terminals.find(term => {
      return term.name === name;
    }) || null
  );
}

function getCwd() {
  let cwd = '';
  let type = '';
  const folders = vscode.workspace.workspaceFolders;
  if (folders === undefined) {
    type = 'file';
  } else if (folders) {
    type = 'directory';
    cwd = folders[0].uri.fsPath;
  }
  return { cwd: cwd, type: type };
}

function showTerminal({ cwd = '', name = '' }): vscode.Terminal {
  const terminalName = TERMINAL_NAME + ":" + name;
  customTerminal = findTerminal(terminalName);
  if (customTerminal) {
    customTerminal.dispose();
    customTerminal = null;
  }
  customTerminal = vscode.window.createTerminal({
    cwd: cwd,
    name: terminalName
  });
  customTerminal.show();
  return customTerminal;
}

function getRgDirPath() {
  const ripgrepDirPath = vscode.workspace
    .getConfiguration('vscode-grep')
    .get('RipgrepDirPath') as string;
  return ripgrepDirPath ? `${ripgrepDirPath}/` : '';
}

function getFzfDirPath() {
  const fzfDirPath = vscode.workspace
    .getConfiguration('vscode-grep')
    .get('FzfDirPath') as string;
  return fzfDirPath ? `${fzfDirPath}/` : '';
}

function getCommandByOption(option: string | undefined) {
  let res = '';
  if ( option === "Files" ) { 
    res = "grep.files.template.sh";
  }
  if (option === "Find Fzf Text") {
    res = 'grep.template.sh';
  }
  if (option == "Active File") {
    res = "grep.files.template.sh";
  }
  return res;
}

function getActiveEditorFilePath() {
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    let filePath = activeEditor.document.uri.fsPath;  // absolute file path
    let workspaceRoot = vscode.workspace.rootPath || "";  // workspace root path
    if (workspaceRoot) {
      let relativePath = vscode.workspace.asRelativePath(filePath, false);
      console.log(relativePath);  // path of file relative to workspace root
      return relativePath; 
    }
  }
  return "";
}

function getInputByOption(input: string, option: string | undefined) {
  if (option === "Files") {
    return "--files";
  }
  if (option === "Find Fzf Text") {
    if (input.indexOf("--trim") == -1) {
      return `--trim ${input}`;
    }
    return input;
  }
  if (option == "Active File") {
    // otherwise active file is opened
    return `-uuu --trim -g \'${getActiveEditorFilePath()}\' ''` || "";
  }
  return input; // by default
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-grep.runGrep', async () => {
      let option = await vscode.window.showQuickPick(["Files", "Find Fzf Text", "Active File", "Custom"]);
      
      let query = context.globalState.get<string>(`grep.query.${option}`) || "";
      if (option === "Custom") {
        query = await vscode.window.showInputBox({
          value: query,
          prompt: 'Please enter fzf args: --no-sort'
        }) || "";
      } else {
        query = "";
      }

      if (query === undefined) {
        return;
      }
      const fzfOptions = query;
      
      context.globalState.update(`grep.query.${option}`, query);
      query = `${option}:${query}`

      const { cwd, type } = getCwd();
      //let targetFile = '';
      let term: vscode.Terminal | null = null;
      if (type === 'file' && vscode.window.activeTextEditor) {
        //targetFile = vscode.window.activeTextEditor.document.uri.fsPath;
        term = showTerminal({ name: query });
      } else {
        term = showTerminal({cwd: cwd, name: query});
      }

      const query64 = `${Buffer.from(query + cwd, 'utf-8').toString('base64')}`;

      const pythonScriptPath = path.join(__dirname, '..', 'resources', 'interactive_cmd.py');

      const scriptPath = path.join('/tmp', 'vs-grep', );
      if (!fs.existsSync(scriptPath)){
        fs.mkdirSync(scriptPath, { recursive: true }); // The `recursive` option ensures parent directories are also created if they don't exist
      }

      const fileNameRg = path.join(scriptPath, `rg-${query64}-r`);
      const fileNameFzf = path.join(scriptPath, `rg-${query64}-f`);

      let command = fs.readFileSync(path.join(__dirname, '..', 'resources', getCommandByOption(option))).toString()
      
      command = command.split('${FILE_RG}').join(fileNameRg);
      command = command.split('${FILE_FZF}').join(fileNameFzf);
      command = command.replace('${FZF_OPTIONS}', fzfOptions);
      command = command.replace('${PYTHON_SCRIPT}', pythonScriptPath);

      const script = path.join(scriptPath, `grep${query64}.sh`);
      fs.writeFileSync(script, command, "utf-8");

      let input = "";
      if (fs.existsSync(fileNameRg)) {
        input = fs.readFileSync(fileNameRg).toString();
        while (input.length > 0 && input[input.length - 1] === '\n') {
          input = input.substring(0, input.length - 1);
        }
      }
      input = getInputByOption(input, option);

      term?.sendText(`chmod +x ${script}`);
      term?.sendText(script + " \"" + input + "\"", true);
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
