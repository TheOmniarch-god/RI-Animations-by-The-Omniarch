#!/bin/sh
# Build the RI 3D World: bundles world/js/main.js -> world/bundle.js (single classic script).
# Run from anywhere:  sh tools/build.sh
# Self-healing: recreates the node_modules/three stub from world/lib/three every run
# (node_modules is excluded from workspace snapshots; three core is committed at world/lib/three).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p node_modules/three
cp -f world/lib/three/three.module.js node_modules/three/three.module.js
rm -rf node_modules/three/examples
cp -r world/lib/three/examples node_modules/three/examples
cat > node_modules/three/package.json <<'JSON'
{
  "name": "three",
  "version": "0.160.0",
  "type": "module",
  "main": "./three.module.js",
  "module": "./three.module.js",
  "exports": {
    ".": "./three.module.js",
    "./addons/*": "./examples/jsm/*",
    "./examples/jsm/*": "./examples/jsm/*"
  }
}
JSON
if [ ! -x node_modules/.bin/esbuild ]; then
  echo "esbuild missing — installing (PUPPETEER_SKIP_DOWNLOAD=1)…"
  PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-audit --no-fund
fi
./node_modules/.bin/esbuild world/js/main.js --bundle --format=iife --target=es2020 \
  --legal-comments=none --outfile=world/bundle.js
echo "built world/bundle.js ($(wc -c < world/bundle.js) bytes)"
