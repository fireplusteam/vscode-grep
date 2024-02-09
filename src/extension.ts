'use strict';

import * as vscode from 'vscode';
const TERMINAL_NAME = 'grep terminal';
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

function showTerminal(cwd: string = ''): vscode.Terminal {
  customTerminal = findTerminal(TERMINAL_NAME);
  if (customTerminal) {
    customTerminal.dispose();
    customTerminal = null;
  }
  customTerminal = vscode.window.createTerminal({
    cwd: cwd,
    name: TERMINAL_NAME
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
        prompt: 'Please input search word.'
      }) || "";

      if (query === undefined) {
        return;
      }
      context.globalState.update("grep.query", query);

      const { cwd, type } = getCwd();
      let targetFile = '';
      let term = null;
      if (type === 'file' && vscode.window.activeTextEditor) {
        targetFile = vscode.window.activeTextEditor.document.uri.fsPath;
        term = showTerminal();
      } else {
        term = showTerminal(cwd);
      }

      const command = `${getRgDirPath()}rg --line-number --color=always --colors "path:none" --colors "line:none" --colors "match:fg:0xAA,0xDA,0xFA" ${query} ${targetFile} | ${getFzfDirPath()}fzf -e --ansi --color=hl:#5FA392 --bind "ctrl-m:execute-silent(echo {} | cut -f -2 -d ':' | xargs code --goto)" --bind "enter:execute-silent(echo {} | cut -f -2 -d ':' | xargs code --goto)"`;

      term.sendText(command, true);
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
