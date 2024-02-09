#!/bin/bash

npm run compile
vsce package

code vsc-extension-quickstart.6.7.vsix