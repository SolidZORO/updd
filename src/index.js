#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { loadConfig } = require('./config');
const {
  parseJsonFile,
  createCommands,
  showChangelog,
  showProgress,
} = require('./utils');
const upddPkg = require('../package.json');

function install(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} failed (${signal ? `signal ${signal}` : `exit ${code}`}).`,
          ),
        );
    });
  });
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [--only-lock]')
    .option('only-lock', {
      type: 'boolean',
      default: false,
      describe: 'Install configured locked dependencies only',
    })
    .example('$0 --only-lock', 'Install updd locked dependencies only')
    .help()
    .alias('help', 'h')
    .version(upddPkg.version)
    .alias('version', 'v')
    .strict()
    .parse();
  const root = process.cwd();
  const filename = path.join(root, 'package.json');
  const pkg = parseJsonFile(filename);
  const config = await loadConfig(root, pkg);
  const { commands, skipped } = createCommands(pkg, config, argv['only-lock']);
  console.log(`\n🚀 updd v${upddPkg.version} (${config.client})\n`);
  if (skipped.length)
    console.log(`Skipping non-registry dependencies: ${skipped.join(', ')}\n`);
  if (!commands.length) {
    console.log('No dependencies selected for update.');
    return;
  }
  const total = commands.reduce((sum, command) => sum + command.count, 0);
  let done = 0;
  console.log('Updating package.json');
  showProgress(done, total);
  try {
    for (const { command, args, count } of commands) {
      console.log(`\n${command} ${args.join(' ')}\n`);
      await install(command, args, root);
      done += count;
      showProgress(done, total);
    }
  } catch (error) {
    showChangelog(pkg, parseJsonFile(filename), false);
    throw error;
  }
  showChangelog(pkg, parseJsonFile(filename));
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
