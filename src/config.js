const fs = require('fs');
const path = require('path');
const { createJiti } = require('jiti');

const CONFIG_FILES = [
  'updd.config.ts',
  'updd.config.cjs',
  'updd.config.js',
  'updd.config.mjs',
];
const CLIENTS = ['npm', 'yarn', 'pnpm'];
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

async function loadConfig(root, pkg) {
  const filename = CONFIG_FILES.find((name) =>
    fs.existsSync(path.join(root, name)),
  );
  const source = filename || 'package.json#updd';
  const config = filename
    ? await createJiti(__filename).import(path.join(root, filename), {
        default: true,
      })
    : pkg.updd === undefined
      ? {}
      : pkg.updd;

  if (!isObject(config))
    throw new Error(`${source} must export a configuration object.`);
  if (config.client !== undefined && !CLIENTS.includes(config.client)) {
    throw new Error(`${source}: client must be npm, yarn or pnpm.`);
  }
  if (
    config.ignore !== undefined &&
    (!Array.isArray(config.ignore) ||
      config.ignore.some((name) => typeof name !== 'string'))
  ) {
    throw new Error(`${source}: ignore must be an array of package names.`);
  }
  for (const key of ['lockDeps', 'lockDevDeps']) {
    if (
      config[key] !== undefined &&
      (!isObject(config[key]) ||
        Object.values(config[key]).some(
          (version) => typeof version !== 'string' || !version.trim(),
        ))
    ) {
      throw new Error(
        `${source}: ${key} must map package names to version strings.`,
      );
    }
  }
  return {
    client: config.client ?? 'yarn',
    ignore: config.ignore ?? [],
    lockDeps: config.lockDeps ?? {},
    lockDevDeps: config.lockDevDeps ?? {},
  };
}

module.exports = { loadConfig, CONFIG_FILES };
