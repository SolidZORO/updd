# updd

[![VERSION][version-badge-svg]][version-badge-url] [![LICENSE][license-badge-svg]](./LICENSE)

Update package.json dependencies & devDependencies to latest version.

## Installation

```bash
yarn add -D updd
```

or Global

```bash
npm i -g updd
```


## Usage

in the `package.json` file directory.

```bash
updd
```

## Config

in `package.json`, `updd` key:

client: `yarn` | `npm`, (defalut: `yarn`)

ignore: `['any', 'package-name']`, (defalut: `[]`)

e.g.:

```json
{
  "name": "updd",
  "updd": {
    "client": "yarn",
    "ignore": [
      "https://github.com/SolidZORO/updd",
      "react"
    ]
  },
  "dependencies": {
  },
  "devDependencies": {
  }
}
```


## Principle

Collect all `dependencies` and `devDependencies`, install, it will automatically update to the latest version.

Can be used instead of `yarn upgrade-interactive` to solve the non-update problem.


## License

MIT © 2021

<!-- link -->

[license-badge-svg]: https://img.shields.io/badge/License-MIT-green.svg

[version-badge-svg]: https://badge.fury.io/js/%40SolidZORO%2Fupdd.svg

[version-badge-url]: https://badge.fury.io/js/%40SolidZORO%2Fupdd

