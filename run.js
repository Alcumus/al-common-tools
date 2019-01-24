const _ = require('lodash');
const shellHelper = require('./src/helpers/shell-helper.js');
const path = require('path');

const runShell = verbose => (command, ...args) => {
    if (args.includes(useProcessArguments)) {
        args.splice(args.indexOf(useProcessArguments), 1, ...process.argv.slice(2));
    }
    const directory = process.cwd();
    if (verbose) {
        console.info(`Starting command: "${command} ${args.join(' ')}" in directory: "${directory}"`);
    }
    return shellHelper.run({
        directory,
        command,
        args
    })
        .then(result => {
            if (verbose) {
                console.info(result.output);
            }
            return result;
        })
        .catch(error => {
            error = _.get(error, 'output', error);
            if (verbose) {
                console.error(error);
            }
            return Promise.reject(error);
        });
};

const runScript = verbose => (command, ...args) => {
    return runShell(verbose)('node', path.join(__dirname, command), ...args);
};

const useProcessArguments = Symbol('use-process-arguments');

module.exports = {
    useProcessArguments,
    runShell: runShell(false),
    runShellVerbose: runShell(true),
    runScript: runScript(false),
    runScriptVerbose: runScript(true)
};
