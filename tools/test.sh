#!/bin/sh
# Headless-Tests: sh tools/test.sh [filter]
cd "$(dirname "$0")/.." && "/c/Users/Student/AppData/Local/node-portable/node-v24.21.0-win-x64/node.exe" tests/run.js "$@"
