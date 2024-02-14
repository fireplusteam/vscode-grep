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

function getRelativePath(filePath: string) {
  let workspaceRoot = vscode.workspace.rootPath || "";  // workspace root path
  if (workspaceRoot) {
    let relativePath = vscode.workspace.asRelativePath(filePath, false);
    console.log(relativePath);  // path of file relative to workspace root
    return relativePath; 
  }
  return path;
}

function getActiveEditorFilePath() {
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    let filePath = getRelativePath(activeEditor.document.uri.fsPath);  // absolute file path
    return filePath;
  }
  return "";
}

function getAllActiveEditorsPaths() {
  const files = vscode.workspace.textDocuments.map(doc => {
    return getRelativePath(doc.uri.fsPath);
  });
  return files;
}

function getCommandByOption(option: string | undefined) {
  let res = '';
  if ( option === "Files" || option === "Buffers Files" ) { 
    res = "grep.files.template.sh";
  }
  if (option === "Content Search" || option === 'Custom') {
    res = 'grep.template.sh';
  }
  if (option === "Content Search: Active File") {
    res = "grep.active.file.template.sh";
  }
  if (option === "Content Search: Buffers") {
    res = "grep.buffer.files.content.template.sh";
  }
  return res;
}

function getInputByOption(input: string, option: string | undefined) {
  // awk to print file path in format: filename ~> /path/
  if (option === "Files") {
    if (input.indexOf("--files") === -1) {
      input = `--files ${input}`;
    }
    return input;
  }
  if (option === "Buffers Files") {
    return `-uuu --files -g '{${getAllActiveEditorsPaths().join(",")}}'`;
  }
  if (option === "Content Search") {
    return input;
  }
  if (option === "Content Search: Active File") {
    // otherwise active file is opened
    return `-uuu --heading -g \'${getActiveEditorFilePath()}\' ''` || "";
  }
  if (option === "Content Search: Buffers") {
    return `-uuu -g '{${getAllActiveEditorsPaths().join(",")} ''}' ''`;
  }
  return input; // by default
}

function getFzfOptions(query: string, option: string | undefined) {
  if (option === "Content Search" || option === "Content Search: Buffers") {
    return '--nth 4..1999';
  }
  return query;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-grep.runGrep', async () => {
      let option = await vscode.window.showQuickPick(["Files", "Buffers Files", "Content Search", "Content Search: Buffers", "Content Search: Active File", "Custom"]);
      
      let query = context.globalState.get<string>(`grep.query.${option}`) || "";
      if (option === "Custom") {
        query = await vscode.window.showInputBox({
          value: query,
          prompt: 'Please enter fzf args: --no-sort'
        }) || "";
      } else {
        query = "";
      }

      if (query === undefined || option === undefined) {
        return;
      }
      context.globalState.update(`grep.query.${option}`, query);
      
      const fzfOptions = getFzfOptions(query, option);
      query = `${option}:${query}`;

      const { cwd, type } = getCwd();
      let term: vscode.Terminal | null = null;
      if (type === 'file' && vscode.window.activeTextEditor) {
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

      let command = fs.readFileSync(path.join(__dirname, '..', 'resources', getCommandByOption(option))).toString();
      
      command = command.split('${FILE_RG}').join(fileNameRg);
      command = command.split('${FILE_FZF}').join(fileNameFzf);
      command = command.replace('${FZF_OPTIONS}', fzfOptions);
      command = command.split('${PYTHON_SCRIPT}').join(pythonScriptPath);
      if (option === "Content Search: Active File") {
        command = command.split('${PREVIEW_FILE}').join(getActiveEditorFilePath().toString());
      }

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
      term?.sendText(script + " \"" + Buffer.from(input, 'utf-8').toString('base64') + "\"", true);
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
