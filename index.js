#!/usr/bin/env node
const path = require('path');
const { exec } = require('child_process');
const _ = require('lodash');

const { genExecStr, parseJsonFile } = require('./utils');

let client = 'yarn'

let deps = [];
let devDeps = [];
let ignoreDeps = [];

const ROOT_DIR = path.resolve(process.cwd());

const pkg = parseJsonFile(path.resolve(`${ROOT_DIR}/package.json`));
const upddPkg = parseJsonFile(path.resolve(__dirname, 'package.json'));

if (pkg) {
  // get keys to array
  if (pkg.devDependencies) devDeps = Object.keys(pkg.devDependencies);
  if (pkg.dependencies) deps = Object.keys(pkg.dependencies);

  // updd opts
  if (pkg.updd && pkg.updd.client) client = pkg.updd.client;
  if (pkg.updd && pkg.updd.ignore) ignoreDeps = pkg.updd.ignore;
}

console.log(deps);

// remove ignoreDeps
deps = _.difference(deps, ignoreDeps)
devDeps = _.difference(devDeps, ignoreDeps)

// just output console
console.log('\n---- deps ----');
console.log(deps.join('\n'));
console.log('\n\n---- devDeps ----');
console.log(devDeps.join('\n'));
console.log('\n\n---- ignoreDeps ----');
console.log(ignoreDeps.join('\n'));
console.log('\n');

const execStr = genExecStr(client, { deps, devDeps });

if (!execStr) {
  console.error(`ERROR: Not Found exec. (${execStr})`);
  return;
}

console.log(`🚀 Exec Verbose Info\n`);
console.log(`   updd - v${upddPkg.version}`);
console.log(`project - v${pkg.version}`);

// eslint-disable-next-line max-len
console.log(`\n\n\n${execStr.split('&&').map((e) => _.trim(e)).join('\n\n')}\n\n`); // prettier-ignore

exec(execStr, (err, stdout) => {
  if (err) {
    console.error(`ERROR: exec (${err})`);
    return;
  }

  console.log(stdout);
});
