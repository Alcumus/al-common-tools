const promisify = require('util').promisify;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const lintingRules = require('./linting-rules.js');

fs.writeFile = promisify(fs.writeFile);

const packageJsonFragments = linters => {
    if (!_.isArray(linters)) {
        linters = [linters];
    }
    const common = linters.map(linter => `${linter.name} ${linter.fileMatcher}`);
    const lint = common.join(' && ');
    const fix = common.map(executeLinter => `${executeLinter} --fix`).join(' && ');
    return {
        scripts: {
            lint,
            fix
        }
    };
};

const getDependencies = requestedRules => {
    return Object.entries(_.pick(lintingRules.dependencies, requestedRules))
        .map(([__rule, dependencies]) => dependencies)
        .reduce((allDependencies, ruleDependencies) => _.merge(allDependencies, ruleDependencies), {});
};

const addLintingToPackageJson = (linters, directory, dependenciesToAdd) => () => {
    const packageJsonPath = path.join(directory, 'package.json');
    const packageJson = require(packageJsonPath);
    const valuesToAdd = {
        scripts: {
            watch: 'nodemon --ext ts,html,scss,js,json --exec "npm run lint || exit 1"'
        }
    };

    _.merge(valuesToAdd, packageJsonFragments(linters));
    if (!_.isEmpty(dependenciesToAdd)) {
        _.merge(valuesToAdd, {
            devDependencies: dependenciesToAdd
        });
    }

    const newPackageJson = _.mergeWith(packageJson, valuesToAdd, (oldValue, newValue) => {
        if (_.isUndefined(oldValue)) {
            return newValue;
        }
        if (_.isObject(oldValue)) {
            return undefined;
        }
        return oldValue;
    });
    return fs.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
};

const getRulesObject = requestedRules => existingRules => {
    let foundRules = existingRules.filter(rule => requestedRules.includes(rule.name));
    if (foundRules.length === 0) {
        foundRules = existingRules.filter(rule => rule.name === 'default');
        if (foundRules.length === 0) {
            return Promise.reject(`Could not find any of the requested linting rules: ${requestedRules}`);
        }
    }
    if (foundRules.length < requestedRules) {
        console.warn('Could not find requested linting rules:', _.xor(requestedRules, foundRules.map(rule => rule.name)));
    }
    return {
        extends: foundRules.map(rule => rule.path),
        root: true
    };
};

const writeRulesFile = (linter, directory) => rules => {
    let config = {};
    const configFilePath = path.join(directory, linter.configFile);

    try {
        config = JSON.parse(fs.readFileSync(configFilePath));
    } catch (err) {
        console.warn('No existing config found for', configFilePath);
    }

    Object.assign(config, rules);

    return fs.writeFile(
        path.join(directory, linter.configFile),
        JSON.stringify(config, null, 4)
    );
};

const getLinter = linterName => lintingRules.linters.find(linter => linter.name === linterName);

const addLinter = (linterName, directory, requestedRules = []) => {
    const linter = getLinter(linterName);
    if (!linter) {
        return Promise.reject(
            new Error(`Invalid linter: ${linterName}; must be one of ${lintingRules.linters.map(linter => linter.name).join(', ')}`)
        );
    }

    requestedRules = requestedRules.map(rule => rule.toLowerCase() === 'ng' ? 'angular' : rule.toLowerCase());
    return lintingRules.getRules(linter)
        .then(getRulesObject(requestedRules))
        .then(writeRulesFile(linter, directory));
};

const addLinters = (linterNames, directory, requestedRules = []) => {
    if (!_.isArray(linterNames)) {
        linterNames = [linterNames];
    }
    return Promise.all(linterNames.map(linterName => addLinter(linterName, directory, requestedRules)))
        .then(addLintingToPackageJson(linterNames.map(getLinter), directory, getDependencies(requestedRules)));
};

module.exports = {
    addLinters
};
