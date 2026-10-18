const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadConfig } = require('../src/config');
const { createCommands, diffPackage } = require('../src/utils');
const cli = path.resolve(__dirname, '../src/index.js');

function fixture(t, pkg = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'updd-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  return root;
}

for (const [extension, source, type] of [
  [
    'ts',
    "import { client } from './client'; const config: { client: string } = { client }; export default config;",
  ],
  ['cjs', "module.exports = { client: 'pnpm' };"],
  ['js', "module.exports = { client: 'pnpm' };"],
  ['js', "export default { client: 'pnpm' };", 'module'],
  ['mjs', "export default { client: 'pnpm' };"],
]) {
  test(`loads ${extension} config (${type || 'commonjs'}) ahead of package.json`, async (t) => {
    const pkg = { type, updd: { client: 'npm', ignore: ['old'] } };
    const root = fixture(t, pkg);
    fs.writeFileSync(
      path.join(root, 'client.ts'),
      "export const client: string = 'pnpm';",
    );
    fs.writeFileSync(path.join(root, `updd.config.${extension}`), source);
    const config = await loadConfig(root, pkg);
    assert.equal(config.client, 'pnpm');
    assert.deepEqual(config.ignore, []);
  });
}

test('supports legacy package.json config and yarn default', async (t) => {
  const root = fixture(t);
  assert.equal((await loadConfig(root, {})).client, 'yarn');
  assert.equal(
    (await loadConfig(root, { updd: { client: 'pnpm' } })).client,
    'pnpm',
  );
});

test('undefined optional config fields retain defaults', async (t) => {
  const config = await loadConfig(fixture(t), {
    updd: { client: undefined, ignore: undefined, lockDeps: undefined },
  });
  assert.equal(config.client, 'yarn');
  assert.deepEqual(config.ignore, []);
  assert.deepEqual(config.lockDeps, {});
});

test('config discovery has deterministic precedence', async (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, 'updd.config.ts'),
    "export default { client: 'pnpm' };",
  );
  fs.writeFileSync(
    path.join(root, 'updd.config.cjs'),
    "module.exports = { client: 'npm' };",
  );
  assert.equal((await loadConfig(root, {})).client, 'pnpm');
});

for (const updd of [
  null,
  [],
  { client: 'invalid' },
  { ignore: 'react' },
  { ignore: [123] },
  { lockDeps: [] },
  { lockDevDeps: { react: 123 } },
]) {
  test(`rejects invalid config ${JSON.stringify(updd)}`, async (t) => {
    await assert.rejects(loadConfig(fixture(t), { updd }));
  });
}

for (const client of ['npm', 'yarn', 'pnpm']) {
  test(`${client} commands update latest, respect ignores and scoped locks`, async (t) => {
    const config = await loadConfig(fixture(t), {
      updd: {
        client,
        ignore: ['skip'],
        lockDeps: { '@scope/locked': '2.0.0' },
      },
    });
    const pkg = {
      dependencies: { normal: '^1.0.0', skip: '1', '@scope/locked': '1' },
      devDependencies: { dev: '1' },
    };
    const { commands } = createCommands(pkg, config);
    assert.deepEqual(
      commands.map((command) => command.args),
      [
        [
          client === 'npm' ? 'install' : 'add',
          'normal@latest',
          '@scope/locked@2.0.0',
        ],
        [client === 'npm' ? 'install' : 'add', '-D', 'dev@latest'],
      ],
    );
    assert.deepEqual(
      createCommands(pkg, config, true).commands[0].args.slice(1),
      ['@scope/locked@2.0.0'],
    );
  });
}

test('does not replace workspace, local, aliases or Git dependencies', async (t) => {
  const config = await loadConfig(fixture(t), {});
  const dependencies = Object.fromEntries(
    [
      'workspace:*',
      'file:../local',
      'link:../local',
      'npm:other@1',
      'https://example.com/a.tgz',
      'github:user/repo',
      'user/repo',
      'git+ssh://git@example.com/repo',
      'catalog:',
      '../local',
    ].map((version, i) => [`pkg${i}`, version]),
  );
  assert.equal(createCommands({ dependencies }, config).commands.length, 0);
});

test('diff includes actual dependency and development version changes', () => {
  assert.deepEqual(
    diffPackage(
      { dependencies: { react: '1' }, devDependencies: { prettier: '^2.7.1' } },
      { dependencies: { react: '2' }, devDependencies: { prettier: '^3.0.0' } },
    ),
    {
      dependencies: [{ name: 'react', oldVersion: '1', newVersion: '2' }],
      devDependencies: [
        { name: 'prettier', oldVersion: '^2.7.1', newVersion: '^3.0.0' },
      ],
    },
  );
});

function run(root, args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', ...extraEnv },
  });
}

function fakeClient(root, client) {
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, client),
    `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
if (process.env.FAIL_INSTALL === '1' && args.includes('-D')) { console.error('registry unavailable'); process.exit(7); }
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const section = args.includes('-D') ? 'devDependencies' : 'dependencies';
for (const spec of args.slice(1).filter(arg => arg !== '-D')) {
  const at = spec.lastIndexOf('@');
  const version = spec.slice(at + 1);
  pkg[section][spec.slice(0, at)] = version === 'latest' ? '^3.0.0' : version;
}
fs.writeFileSync('package.json', JSON.stringify(pkg));
`,
    { mode: 0o755 },
  );
  return `${bin}${path.delimiter}${process.env.PATH}`;
}

for (const client of ['npm', 'yarn', 'pnpm']) {
  test(`CLI ${client}: progress and aligned old → new output`, (t) => {
    const root = fixture(t, {
      updd: { client },
      dependencies: { eslint: '7.32.0' },
      devDependencies: { prettier: '^2.7.1' },
    });
    const result = run(root, [], { PATH: fakeClient(root, client) });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2\/2 100%/);
    assert.match(result.stdout, /eslint\s+7\.32\.0\s+→\s+\^3\.0\.0/);
    assert.match(result.stdout, /prettier\s+\^2\.7\.1\s+→\s+\^3\.0\.0/);
    assert.match(result.stdout, /dependencies\n eslint/);
    assert.match(result.stdout, /devDependencies\n prettier/);
  });
}

function changelogOutput(oldPkg, newPkg, completed = true) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "require('./src/utils').showChangelog(...JSON.parse(process.argv[1]))",
      JSON.stringify([oldPkg, newPkg, completed]),
    ],
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '1' },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('changelog groups dependencies and colors major/minor/patch upgrades', () => {
  const output = changelogOutput(
    {
      dependencies: { sentry: '^10.70.0', axios: '~1.19.0' },
      devDependencies: { prettier: '3.0.0' },
    },
    {
      dependencies: { sentry: '^11.8.0', axios: '~1.20.0' },
      devDependencies: { prettier: '3.0.1' },
    },
  );
  assert.ok(output.indexOf('dependencies') < output.indexOf('sentry'));
  assert.ok(output.indexOf('axios') < output.indexOf('devDependencies'));
  assert.ok(output.indexOf('devDependencies') < output.indexOf('prettier'));
  assert.ok(output.includes('\x1b[31m^11.8.0\x1b[39m'));
  assert.ok(output.includes('\x1b[33m~1.20.0\x1b[39m'));
  assert.ok(output.includes('\x1b[32m3.0.1\x1b[39m'));
});

test('changelog omits empty groups and does not color downgrades or nonnumeric changes as upgrades', () => {
  const output = changelogOutput(
    {
      dependencies: {
        downgrade: '^3.9.9',
        prefix: '1.0.0',
        tag: 'next',
        prerelease: '1.0.0-beta.1',
      },
    },
    {
      dependencies: {
        downgrade: '^2.10.0',
        prefix: '^1.0.0',
        tag: 'latest',
        prerelease: '1.0.0',
      },
    },
    false,
  );
  assert.ok(!output.includes('devDependencies'));
  assert.ok(output.includes('Changes written before the failure'));
  for (const version of ['^2.10.0', '^1.0.0', 'latest', '1.0.0']) {
    assert.ok(output.includes(`\x1b[90m${version}\x1b[39m`));
  }
});

test('CLI --only-lock only installs selected locks', (t) => {
  const root = fixture(t, {
    updd: { client: 'pnpm', lockDeps: { '@scope/pkg': '2.0.0' } },
    dependencies: { '@scope/pkg': '1', other: '1' },
  });
  const result = run(root, ['--only-lock'], { PATH: fakeClient(root, 'pnpm') });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(root, 'calls.jsonl'), 'utf8').trim()),
    ['add', '@scope/pkg@2.0.0'],
  );
});

test('failed installs return nonzero, show stderr and report partial changes', (t) => {
  const root = fixture(t, {
    updd: { client: 'pnpm' },
    dependencies: { eslint: '1' },
    devDependencies: { prettier: '1' },
  });
  const result = run(root, [], {
    PATH: fakeClient(root, 'pnpm'),
    FAIL_INSTALL: '1',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /registry unavailable/);
  assert.match(result.stderr, /exit 7/);
  assert.match(result.stdout, /Changes written before the failure/);
  assert.match(result.stdout, /eslint\s+1\s+→\s+\^3.0.0/);
  assert.doesNotMatch(result.stdout, /Update Completed|2\/2 100%/);
});

test('empty selection is a successful no-op', (t) => {
  const result = run(fixture(t, {}));
  assert.equal(result.status, 0);
  assert.match(result.stdout, /No dependencies selected/);
});

test('missing package.json fails, while help and version work outside a project', (t) => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, 'package.json'));
  assert.equal(run(root).status, 1);
  assert.equal(run(root, ['--help']).status, 0);
  assert.equal(run(root, ['--version']).status, 0);
});

test('malformed config fails before running a package manager', (t) => {
  const root = fixture(t, { dependencies: { eslint: '1' } });
  fs.writeFileSync(
    path.join(root, 'updd.config.ts'),
    'export default { client: ;',
  );
  assert.equal(run(root).status, 1);
  assert.equal(fs.existsSync(path.join(root, 'calls.jsonl')), false);
});
