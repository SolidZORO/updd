#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const _ = require('lodash');

const CWD_DIR = process.cwd();
const ROOT_DIR = path.resolve(CWD_DIR);
const PACKAGE_JSON_FILE = path.resolve(`${ROOT_DIR}/package.json`);

upddPkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
);

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

// just output console
console.log('\n---- deps ----');
console.log(deps.join('\n'));
console.log('\n\n---- devDeps ----');
console.log(devDeps.join('\n'));
console.log('\n\n---- ignoreDeps ----');
console.log(ignoreDeps.join('\n'));
console.log('\n');

// to string
deps = deps.join(' ')
devDeps = devDeps.join(' ')

const genSymbols = (cl) => {
  if (cl === 'npm') return 'i';
  if (cl === 'yarn') return 'add';
}

const genExecStr = (cl) => {
  const sym = genSymbols(cl);

  let depsExecStr = '';
  let devDepsExecStr = '';

  if (deps) depsExecStr = `${cl} ${sym} ${deps}`;
  if (devDeps) devDepsExecStr = `${cl} ${sym} -D ${devDeps}`;

  return [depsExecStr, devDepsExecStr]
    .filter((s) => !(_.isEmpty(s)))
    .join(' && ');

}

const execStr = genExecStr(client);

if (!execStr) {
  console.error(`ERROR: Not Found exec. (${execStr})`);
}

console.log(`🚀 Exec Verbose Info\n`);
console.log(`   updd - v${upddPkg.version}`);
console.log(`project - v${pkg.version}`);

// eslint-disable-next-line max-len
console.log(`\n\n\n${execStr.split('&&').map((e) => _.trim(e)).join('\n\n')}\n\n`); // prettier-ignore

exec(execStr, (err, stdout) => {
  if (err) console.error(`ERROR: exec (${err})`);

  console.log(stdout);
});
