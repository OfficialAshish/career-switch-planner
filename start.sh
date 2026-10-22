#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Install Node.js 24+ from https://nodejs.org'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<24){console.error("Node.js 24+ required");process.exit(1)}'
if [ ! -d node_modules ]; then npm ci; fi
npm run build
npm start
