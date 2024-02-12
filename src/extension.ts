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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-grep.runGrep', async () => {
      let query = context.globalState.get<string>("grep.query");
      query = await vscode.window.showInputBox({
        value: query,
        prompt: 'Please enter fzf args: --no-sort'
      }) || "";

      if (query === undefined) {
        return;
      }
      const fzfOptions = query;
      
      context.globalState.update("grep.query", query);

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

      let command = fs.readFileSync(path.join(__dirname, '..', 'resources', 'grep.template.sh')).toString()
      command = command.split('${QUERY}').join(query64);
      command = command.replace('${FZF_OPTIONS}', fzfOptions);
      command = command.replace('${PYTHON_SCRIPT}', pythonScriptPath);

      const scriptPath = path.join('/tmp', 'vs-grep', );
      if (!fs.existsSync(scriptPath)){
        fs.mkdirSync(scriptPath, { recursive: true }); // The `recursive` option ensures parent directories are also created if they don't exist
      }
      const script = path.join(scriptPath, `grep${query64}.sh`);
      fs.writeFileSync(script, command, "utf-8");

      term?.sendText(`chmod +x ${script}`);
      term?.sendText(script, true);
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
