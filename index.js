#!/usr/bin/env node
const path = require('path');
const { exec } = require('child_process');
const _ = require('lodash');
const chalk = require('chalk');

const { genExecStr, parseJsonFile, showChangelog } = require('./utils');

let client = 'yarn'

let deps = [];
let devDeps = [];
let ignoreDeps = [];

const ROOT_DIR = path.resolve(process.cwd());

const pkg = parseJsonFile(path.resolve(`${ROOT_DIR}/package.json`));

if (pkg) {
  // get keys to array
  if (pkg.devDependencies) devDeps = Object.keys(pkg.devDependencies);
  if (pkg.dependencies) deps = Object.keys(pkg.dependencies);

  // updd opts
  if (pkg.updd && pkg.updd.client) client = pkg.updd.client;
  if (pkg.updd && pkg.updd.ignore) ignoreDeps = pkg.updd.ignore;
}

// remove ignoreDeps
deps = _.difference(deps, ignoreDeps)
devDeps = _.difference(devDeps, ignoreDeps)

// check exec string
const execStr = genExecStr(client, { deps, devDeps });
if (!execStr) return console.error(`ERROR: Not Found exec. (${execStr})`);

// for display updd bin version
const upddPkg = parseJsonFile(path.resolve(__dirname, 'package.json'));

// show exec verbose
console.log(
  `\n\n🚀 updd v${upddPkg.version} ${chalk.grey('(project v' + pkg.version + ')')}\n` // prettier-ignore
);

// eslint-disable-next-line max-len
console.log(
  `${execStr.split('&&')
    .map((e) => chalk.bold(_.trim(e)))
    .join('\n\n')}\n\n\n\n`
);

exec(execStr, (err, stdout) => {
  if (err) return console.error(`ERROR: exec (${err})`);

  console.log('📮 Update Log\n');
  console.log(stdout);

  const newPkg = parseJsonFile(path.resolve(`${ROOT_DIR}/package.json`));
  showChangelog(pkg, newPkg);
});
