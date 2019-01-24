#!/usr/bin/env node

const yargs = require('yargs');
const configHelper = require('./src/helpers/config-helper');

configHelper.load()
    .then(config => {
        yargs.config(config);

        return yargs
            .commandDir('src/commands/pull-request')
            .demandCommand()
            .help()
            .argv;
    });
