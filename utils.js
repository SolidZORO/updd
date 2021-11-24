const fs = require('fs');
const _ = require('lodash');

const genSymbols = (cl) => {
  if (cl === 'npm') return 'i';
  if (cl === 'yarn') return 'add';
}

/**
 *
 * @param cl
 * @param depArrayGroup
 * @returns {string}
 */
const genExecStr = (cl, depArrayGroup) => {
  const sym = genSymbols(cl);

  // to string
  const depsStr = depArrayGroup && !_.isEmpty(depArrayGroup.deps)
    ? depArrayGroup.deps.join(' ')
    : '';

  const devDepsStr = depArrayGroup && !_.isEmpty(depArrayGroup.devDeps)
    ? depArrayGroup.devDeps.join(' ')
    : '';

  let depsExecStr = '';
  let devDepsExecStr = '';

  if (depsStr) depsExecStr = `${cl} ${sym} ${depsStr}`;
  if (devDepsStr) devDepsExecStr = `${cl} ${sym} -D ${devDepsStr}`;

  return [depsExecStr, devDepsExecStr]
    .filter((s) => !(_.isEmpty(s)))
    .join(' && ');
}

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
}

module.exports = {
  genSymbols,
  genExecStr,
  parseJsonFile,
}
