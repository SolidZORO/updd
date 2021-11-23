#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const _ = require('lodash');

const CWD_DIR = process.cwd();
const ROOT_DIR = path.resolve(CWD_DIR);
const PACKAGE_JSON_FILE = path.resolve(`${ROOT_DIR}/package.json`);

if (!fs.existsSync(PACKAGE_JSON_FILE)) {
  console.error(`ERROR: Not Found package.json file. (${PACKAGE_JSON_FILE})`);
  process.exit();
  return;
}

let pkg;
let client = 'yarn'

let deps = {};
let devDeps = {};
let ignoreDeps = [];

try {
  pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, 'utf8'));

  if (pkg) {
    if (pkg.devDependencies) devDeps = Object.keys(pkg.devDependencies);
    if (pkg.dependencies) deps = Object.keys(pkg.dependencies);

    if (pkg.updd && pkg.updd.client) client = pkg.updd.client;
    if (pkg.updd && pkg.updd.ignore) ignoreDeps = pkg.updd.ignore;
  }
} catch (err) {
  console.error(err);
}

// remove ignoreDeps
deps = _.difference(deps, ignoreDeps)
devDeps = _.difference(devDeps, ignoreDeps)

console.log('\n---- deps ----');
console.log(deps.join('\n'));
console.log('\n\n---- devDeps ----');
console.log(devDeps.join('\n'));

deps = deps.join(' ')
devDeps = devDeps.join(' ')

let execStr = '';
if (client === 'npm') execStr = `npm i ${deps} && npm i -D ${devDeps}`;
if (client === 'yarn') execStr = `yarn add ${deps} && yarn add -D ${devDeps}`;

if (!execStr) {
  console.error(`ERROR: Not Found exec. (${execStr})`);
}

console.log(`\n\n🚀 Run Exec:\n${execStr}\n\n`);

exec(execStr, (err, stdout) => {
  if (err) console.error(`ERROR: exec (${err})`);

  console.log(stdout);
});
