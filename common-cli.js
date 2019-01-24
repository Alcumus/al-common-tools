#!/usr/bin/env node

const { runScript, useProcessArguments } = require('./run.js');

Promise.all([
    runScript('editorconfig-cli.js', useProcessArguments),
    runScript('linting-cli.js', useProcessArguments),
    runScript('install-git-hooks.js')
]).catch(error => console.error(error));
