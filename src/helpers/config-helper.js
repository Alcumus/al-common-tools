const _ = require('lodash');
const userHome = require('os').homedir();
const fs = require('fs');
const promisify = require('util').promisify;

fs.readFile = promisify(fs.readFile);

const load = async ({ required = true } = {}) => {
    const parse = buffer => JSON.parse(buffer || '{}');

    return Promise.all([
        fs.readFile(`${userHome}/al-tools.config.json`),
        fs.readFile(`${userHome}/al-tools.credentials.json`)
    ])
        .then(([config, credentials]) => Object.assign({}, parse(config), parse(credentials)))
        .catch(error => {
            if (required === true) {
                return Promise.reject(error);
            }
        })
        .then(config => {
            if (required === true && _.isEmpty(config)) {
                return Promise.reject(new Error('Could not find any config'));
            }
            return config;
        });
};

module.exports = {
    load
};
