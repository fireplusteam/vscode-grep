'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
        prompt: 'Please input search word.'
      }) || "";

      if (query === undefined || query === "") {
        return;
      }
      context.globalState.update("grep.query", query);

      const { cwd, type } = getCwd();
      let targetFile = '';
      let term: vscode.Terminal | null = null;
      if (type === 'file' && vscode.window.activeTextEditor) {
        targetFile = vscode.window.activeTextEditor.document.uri.fsPath;
        term = showTerminal({ name: query });
      } else {
        term = showTerminal({cwd: cwd, name: query});
      }

      const command = `#!/bin/bash\n${getRgDirPath()}rg --line-number --color=always --colors "path:none" --colors "line:none" --colors "match:fg:0xAA,0xDA,0xFA" ${query} ${targetFile} | ${getFzfDirPath()}fzf -i -e --ansi --color=hl:#5FA392 --bind "ctrl-m:execute-silent(echo {} | cut -f -2 -d ':' | xargs code --goto)" --bind "enter:execute-silent(echo {} | cut -f -2 -d ':' | xargs code --goto)"`;
      const scriptPath = path.join(__dirname, '..', 'src', 'grep.sh');
      fs.writeFile(scriptPath, command, "utf-8", function (err) {
        if (err) {
          console.log(`file is not updated: ${scriptPath}`);
        } else {
          term?.sendText(scriptPath, true);
        }
      });
    })
  );

  vscode.window.onDidCloseTerminal(terminal => {
    if (terminal.name === TERMINAL_NAME) {
      customTerminal = null;
    }
  });
}
