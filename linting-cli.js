#!/usr/bin/env node
const _ = require('lodash');
const lintingRules = require('./src/linting/linting-rules.js');

const checkLinterAlias = (linter, alias, args, matchedLinters) => {
    if (args.includes(alias)) {
        const linterName = linter.name || linter;
        if (!matchedLinters.includes(linterName)) {
            matchedLinters.push(linterName);
            if (linter.remove) {
                _.pull(args, alias);
            }
        }
    }
};

const linterAliases = {
    angular: 'tslint',
    ng: 'tslint',
    style: { name: 'stylelint', remove: true }
};

const getLinters = (args) => {
    const linterNames = lintingRules.linters.map(linter => linter.name);
    const defaultLinters = linterNames.filter(linter => linter !== 'tslint');
    const matchedLinters = _.intersection(args, linterNames);
    _.forEach(linterAliases, (linter, alias) => checkLinterAlias(linter, alias, args, matchedLinters));
    if (matchedLinters.length > 0) {
        return matchedLinters;
    }
    return defaultLinters;
};

const args = process.argv.slice(2).map(argument => argument.toLowerCase());
const linters = getLinters(args);
const types = args.filter(argument => !linters.includes(argument));

require('./src/linting/linting.js')
    .addLinters(linters, process.cwd(), types)
    // eslint-disable-next-line no-console
    .catch(error => console.error(error));
