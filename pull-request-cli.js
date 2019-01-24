#!/usr/bin/env node

const yargs = require('yargs');

try {
    const config = require('./config.json');
    yargs.config(config);
} catch (error) {
    // Ignore.
}

yargs
    .commandDir('src/commands/pull-request')
    .demandCommand()
    .help()
    .argv;
