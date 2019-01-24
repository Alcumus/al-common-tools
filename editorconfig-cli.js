#!/usr/bin/env node
const promisify = require('util').promisify;
const fs = require('fs');
const path = require('path');

fs.symlink = promisify(fs.symlink);
fs.rename = promisify(fs.rename);

const source = path.relative(process.cwd(), path.join(__dirname, 'node_modules/alcumus-linting-rules/resources/.editorconfig'));
const target = path.join(process.cwd(), '.editorconfig');
const tempLocation = path.join(__dirname, 'temp-symlink-file');

fs.symlink(source, tempLocation)
    .then(() => fs.rename(tempLocation, target))
    // eslint-disable-next-line no-console
    .catch(error => console.error(error));
