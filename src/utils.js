const fs = require('fs');
const _ = require('lodash');
const deepDiff = require('deep-diff');
const chalk = require('chalk');

const genSymbols = (client) => {
  if (client === 'npm') return 'i';
  if (client === 'yarn') return 'add';
};

const depsArrayToSrring = (deps) => {
  return !_.isEmpty(deps) ? deps.join(' ') : '';
};

const handleLockDeps = (look, str) => {
  let nextStr = str;

  if (!_.isEmpty(look)) {
    _.forEach(look, (v, pkgName) => {
      nextStr = nextStr.replace(pkgName, `${pkgName}@${v}`);
    });
  }

  return nextStr;
};

const pickLockDeps = (depsStr) => {
  return (
    (depsStr || '')
      .split(' ')
      // substring(1 to remove the @scope)
      .filter((s) => s.substring(1).includes('@'))
      .join(' ')
  );
};

/**
 *
 * @param client
 *
 * @param deps
 * @param devDeps
 * @param lockDeps
 * @param lockDevDeps
 * @param argv
 *
 * @returns {string}
 */
const genExecStr = (client, { deps, devDeps, lockDeps, lockDevDeps, ARGV }) => {
  const sym = genSymbols(client);

  let depsStr = handleLockDeps(lockDeps, depsArrayToSrring(deps));
  let devDepsStr = handleLockDeps(lockDevDeps, depsArrayToSrring(devDeps));

  // console.log(111, 'depsStr', depsStr);
  // console.log(111, 'devDepsStr', devDepsStr);

  // argv --only-lock
  if (ARGV['only-lock']) {
    depsStr = pickLockDeps(depsStr);
    devDepsStr = pickLockDeps(devDepsStr);
  }

  // console.log(222, 'depsStr', depsStr);
  // console.log(222, 'devDepsStr', devDepsStr);

  // console.log('lockDeps', lockDeps);
  // console.log('lockDevDeps', lockDevDeps);

  let depsExecStr = '';
  let devDepsExecStr = '';

  if (depsStr) depsExecStr = `${client} ${sym} ${depsStr}`;
  if (devDepsStr) devDepsExecStr = `${client} ${sym} -D ${devDepsStr}`;

  return [depsExecStr, devDepsExecStr]
    .filter((s) => !_.isEmpty(s))
    .join(' && ');
};

const parseJsonFile = (jsonPath) => {
  let obj = {};

  if (!fs.existsSync(jsonPath)) {
    console.error(`ERROR: Not Found Json File. (${jsonPath})`);
    process.exit();
    return obj;
  }

  const jsonData = fs.readFileSync(jsonPath, 'utf8');

  try {
    obj = JSON.parse(jsonData);
  } catch (err) {
    console.error('parseJson Error', err);
  }

  return obj;
};

const diffPackage = (oldPkg, newPkg) => {
  const changeList = { dependencies: [], devDependencies: [] };
  const diffList = deepDiff(oldPkg, newPkg);

  if (_.isEmpty(diffList)) return changeList;

  diffList.map((d) =>
    changeList[d.path[0]].push({
      name: d.path[1],
      oldVersion: d.lhs,
      newVersion: d.rhs,
    }),
  );

  return changeList;
};

const showChangelog = (oldPkg, newPkg) => {
  // ---- follow yarn style ----
  // name              from      to
  // lodash.debounce   3.1.1  ???  4.0.8
  // lodash            3.1.1  ???  4.0.8

  const change = diffPackage(oldPkg, newPkg);

  console.log('\n\n\n??? Update Completed\n');

  if (_.isEmpty(change.dependencies) && _.isEmpty(change.devDependencies)) {
    return console.log(
      `${chalk.green(
        'success',
      )} All of your dependencies are up to date.\n\n\n`,
    );
  }

  const allDeps = [];

  if (!_.isEmpty(change.dependencies))
    allDeps.push({
      key: 'dependencies',
      val: change.dependencies,
    });

  if (!_.isEmpty(change.devDependencies))
    allDeps.push({
      key: 'devDependencies',
      val: change.devDependencies,
    });

  const longestName = Math.max(
    ...change.dependencies
      .concat(change.devDependencies)
      .map((el) => el.name.length),
  );

  // pad length
  const namePad = longestName + 10;
  const fromPad = 9;
  const symPad = 4;

  // label color
  const labelColor = chalk.underline.bold.grey;
  const labelColorPad = labelColor(0).length - 1;
  const labelName = _.padEnd(labelColor('name'), namePad + labelColorPad, ' ');
  const labelFrom = _.padEnd(labelColor('from'), fromPad + labelColorPad, ' ');
  const labelSym = _.padEnd(' ', symPad, ' ');
  const labelTo = labelColor('to');

  // linfo color
  const nameColor = chalk.red;
  const nameColorPad = nameColor(0).length - 1;
  const symColor = chalk.cyan;
  const symColorPad = nameColor(0).length - 1;
  const fromColor = chalk.blue;
  const fromColorPad = nameColor(0).length - 1;
  const toColor = chalk.green;

  allDeps.map((dep) => {
    // show label
    console.log(chalk.bold.yellow(dep.key));
    console.log(`${labelName}${labelFrom}${labelSym}${labelTo}`);

    if (!_.isEmpty(dep)) {
      // show name & version
      dep.val.map((c) => {
        const name = _.padEnd(nameColor(c.name), namePad + nameColorPad, ' ');
        const from = _.padEnd(
          fromColor(c.oldVersion),
          fromPad + fromColorPad,
          ' ',
        );
        const sym = _.padEnd(symColor('???'), symPad + symColorPad, ' ');
        const to = toColor(c.newVersion);

        console.log(`${name}${from}${sym}${to}`);
      });
    }

    console.log('\n');
  });
};

module.exports = {
  genSymbols,
  genExecStr,
  parseJsonFile,
  diffPackage,
  showChangelog,
};
