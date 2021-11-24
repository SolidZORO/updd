#!/usr/bin/env node
const path = require('path');

const { parseJsonFile, showChangelog } = require('../utils');

const oldPkg = parseJsonFile(path.resolve(__dirname, './package.old.json'));
const newPkg = parseJsonFile(path.resolve(__dirname, './package.new.json'));

showChangelog(oldPkg, newPkg);
