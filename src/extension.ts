'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
const TERMINAL_NAME = 'g';
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

function extractFzfArguments(query: string) {
  let regex = /\|\s*fzf/; // | fzf with any kind of white spaces
  let match = query.match(regex);
  if (match) {
    let lastInd = query.indexOf("|", (match.index || 0) + 1);
    if (lastInd === -1) {
      lastInd = query.length;
    }
    const fzfOptions = query.substring(( match.index || 0 ) + match.toString().length, lastInd);
    let rgOptions = query.substring(0, match.index) + query.substring(lastInd);
    return [rgOptions, fzfOptions];
  }
  return [query, ""];
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-grep.runGrep', async () => {
      let query = context.globalState.get<string>("grep.query");
      vscode.window.showInformationMessage('\
        Search by Terms: --uu -g \'*.swift\' -g \'!Folder/**\';;; \
        Filter Logs: --uu \'\' -g \'*app.log\' | fzf -no-sort ;;; \
        type --files in rg cmd line'
      );

      query = await vscode.window.showInputBox({
        value: query,
        prompt: 'Please input search word.'
      }) || "";

      if (query === undefined || query === "") {
        return;
      }
      const [rgOptions, fzfOptions] = extractFzfArguments(query);
      
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

      let command = fs.readFileSync(path.join(__dirname, '..', 'src', 'grep.template.sh')).toString()
      command = command.split('${QUERY}').join(query64);
      command = command.replace('${FZF_OPTIONS}', fzfOptions);
      command = command.replace('${RG_OPTIONS}', rgOptions);

      const scriptPath = path.join(__dirname, '..', 'src', `grep${query64}.sh`);
      fs.writeFileSync(scriptPath, command, "utf-8");

      term?.sendText(`chmod +x ${scriptPath}`);
      term?.sendText(scriptPath, true);
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
