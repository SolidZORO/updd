# updd

[![VERSION][version-badge-svg]][version-badge-url] [![LICENSE][license-badge-svg]](./LICENSE)

Update `package.json` dependencies and devDependencies to the latest versions with **pnpm, npm or Yarn**. Installs packages, updates the package manager's lockfile, and prints the actual version changes.

Requires Node.js 18 or newer and the selected package manager on your PATH.

## Installation

```bash
pnpm add -D updd
# or
npm install -g updd
```

## Usage

Run in the directory containing your project's `package.json`:

```bash
pnpm exec updd
# or, with a global installation
updd
```

updd installs `package@latest` for dependencies and devDependencies, including major updates. Packages listed in `ignore` are excluded; `lockDeps` and `lockDevDeps` override the target versions. Workspace, local, alias, catalog, URL and Git dependencies are skipped unless explicitly targeted by a lock override.

```text
Updating package.json
[                    ] 0/5 0%
...
[====================] 5/5 100%

✨ Update Completed

dependencies
 eslint      7.32.0  →   ^8.0.0

devDependencies
 prettier   ^2.7.1  →   ^3.0.0
```

Progress advances after each successful dependency/devDependency install batch. Package manager output remains visible. The final table compares the declarations in `package.json` before and after installation, so version prefixes reflect what your package manager actually saved. Unchanged declarations are omitted. Results are grouped into `dependencies` and `devDependencies`. In color-capable terminals, the new version is red for major upgrades, yellow for minor upgrades, and green for patch upgrades. Downgrades, prefix-only changes, prerelease-only changes and unrecognized version ranges use grey.

To install only the configured locked packages already present in dependencies/devDependencies:

```bash
updd --only-lock
```

Use `updd --help` or `updd --version` for CLI information. Failed installs return a nonzero exit code and report any manifest changes already written.

## Configuration

Create **one** of these files beside `package.json`:

- `updd.config.ts`
- `updd.config.cjs`
- `updd.config.js`
- `updd.config.mjs`

TypeScript and ESM configurations use a default export. No separate TypeScript setup is needed:

```ts
// updd.config.ts (also works as .mjs or ESM .js)
export default {
  client: 'pnpm',
  ignore: ['react', 'react-dom'],
  lockDeps: {
    chalk: '4.1.2',
  },
  lockDevDeps: {
    typescript: '~5.9.0',
  },
};
```

For CommonJS:

```js
// updd.config.cjs (also works as CommonJS .js)
module.exports = {
  client: 'pnpm',
  ignore: ['react'],
};
```

The legacy `package.json` configuration also works:

```json
{
  "updd": {
    "client": "pnpm",
    "ignore": ["react"],
    "lockDeps": { "chalk": "4.1.2" },
    "lockDevDeps": {}
  }
}
```

A standalone configuration file takes precedence over the entire `package.json#updd` configuration; they are not merged. If multiple files exist, the first in the list above is used. Invalid configurations stop the command before installation.

| Option        | Default  | Meaning                                               |
| ------------- | -------- | ----------------------------------------------------- |
| `client`      | `'yarn'` | `'pnpm'`, `'npm'` or `'yarn'`                         |
| `ignore`      | `[]`     | Exact package names to exclude from updates           |
| `lockDeps`    | `{}`     | Dependency names mapped to target versions/ranges     |
| `lockDevDeps` | `{}`     | Dev dependency names mapped to target versions/ranges |

## Development

```bash
yarn install --frozen-lockfile
yarn test:unit
```

Run an actual CLI preview using the root `package.json` and `updd.config.ts`:

```bash
npm test
# or
pnpm test
```

The preview loads the root configuration and installs the root dependencies in a temporary directory. It prints the normal progress and version changes, then removes the temporary files and installed packages, including on failure or Ctrl+C. The project's `package.json`, lockfiles and `node_modules` stay unchanged. Project `.npmrc` settings are copied into the temporary directory. Workspace and local dependencies follow the CLI's normal skip rules; the preview is intended for this repository's registry dependencies.

Use `npm run test:unit` for the automated tests. CLI options can also be forwarded, for example `npm test -- --only-lock`.

## License

MIT © 2021

[license-badge-svg]: https://img.shields.io/badge/License-MIT-green.svg
[version-badge-svg]: https://badge.fury.io/js/updd.svg
[version-badge-url]: https://badge.fury.io/js/updd
