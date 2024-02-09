#!/bin/bash

npm install # resolve dependencies
npm run compile
vsce package

code vscode-grep-0.0.3.vsix