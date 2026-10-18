const fs = require('fs');
const chalk = require('chalk');

function parseJsonFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${filename}: ${error.message}`);
  }
}

function createCommands(pkg, config, onlyLock = false) {
  const commands = [];
  const skipped = [];
  for (const [section, locks, dev] of [
    ['dependencies', config.lockDeps, false],
    ['devDependencies', config.lockDevDeps, true],
  ]) {
    const packages = [];
    for (const [name, version] of Object.entries(pkg[section] || {})) {
      if (config.ignore.includes(name)) continue;
      const locked = Object.hasOwn(locks, name);
      if (onlyLock && !locked) continue;
      // Keep workspace, local, alias, Git and URL dependencies intact unless explicitly locked.
      if (
        !locked &&
        /^(?:workspace:|file:|link:|portal:|patch:|catalog:|npm:|https?:|git(?:\+|:)|github:|gitlab:|bitbucket:|ssh:|\.|\/|~\/)|^[^@\s]+\//.test(
          version,
        )
      ) {
        skipped.push(name);
        continue;
      }
      packages.push(`${name}@${locked ? locks[name] : 'latest'}`);
    }
    if (packages.length) {
      commands.push({
        command: config.client,
        args: [
          config.client === 'npm' ? 'install' : 'add',
          ...(dev ? ['-D'] : []),
          ...packages,
        ],
        count: packages.length,
      });
    }
  }
  return { commands, skipped };
}

function diffPackage(oldPkg, newPkg) {
  const change = { dependencies: [], devDependencies: [] };
  for (const section of Object.keys(change)) {
    for (const [name, oldVersion] of Object.entries(oldPkg[section] || {})) {
      const newVersion = newPkg[section]?.[name];
      if (newVersion !== undefined && oldVersion !== newVersion) {
        change[section].push({ name, oldVersion, newVersion });
      }
    }
  }
  return change;
}

function versionColor(oldVersion, newVersion) {
  const pattern =
    /^[~^]?v?(\d+)\.(\d+)\.(\d+)(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i;
  const oldParts = oldVersion.trim().match(pattern);
  const newParts = newVersion.trim().match(pattern);
  if (!oldParts || !newParts) return chalk.grey;
  const colors = [chalk.red, chalk.yellow, chalk.green];
  for (let index = 1; index <= 3; index += 1) {
    const before = Number(oldParts[index]);
    const after = Number(newParts[index]);
    if (after !== before)
      return after > before ? colors[index - 1] : chalk.grey;
  }
  return chalk.grey;
}

function showChangelog(oldPkg, newPkg, completed = true) {
  const groups = diffPackage(oldPkg, newPkg);
  const changes = Object.values(groups).flat();
  console.log(
    completed
      ? '\n✨ Update Completed\n'
      : '\nChanges written before the failure:\n',
  );
  if (!changes.length) {
    console.log(
      completed
        ? 'No dependency version changes.'
        : 'No dependency version changes were written.',
    );
    return;
  }
  const nameWidth = Math.max(...changes.map((item) => item.name.length));
  const versionWidth = Math.max(
    ...changes.map((item) => item.oldVersion.length),
  );
  for (const [section, entries] of Object.entries(groups)) {
    if (!entries.length) continue;
    console.log(chalk.bold(section));
    for (const { name, oldVersion, newVersion } of entries) {
      const color = versionColor(oldVersion, newVersion);
      console.log(
        ` ${name.padEnd(nameWidth)}  ${chalk.blue(oldVersion.padStart(versionWidth))}  ${chalk.cyan('→')}  ${color(newVersion)}`,
      );
    }
    console.log();
  }
}

function showProgress(done, total) {
  const filled = total ? Math.round((done / total) * 20) : 20;
  console.log(
    `[${'='.repeat(filled)}${' '.repeat(20 - filled)}] ${done}/${total} ${total ? Math.round((done / total) * 100) : 100}%`,
  );
}

module.exports = {
  parseJsonFile,
  createCommands,
  diffPackage,
  showChangelog,
  showProgress,
};
