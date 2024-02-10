#!/bin/bash

# insall dependencies or update them
brew install ripgrep
brew install fzf
brew install bat

npm install # resolve dependencies
npm run compile
vsce package

code --install-extension vscode-grep-fixed-0.0.3.vsix