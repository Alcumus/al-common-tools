const { spawn } = require('child_process');

const run = async ({ directory, command, args, failOnError = true }) => {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, { cwd: directory || '.' });
        const output = {
            log: '',
            error: ''
        };

        const processOutput = (type) => (data) => {
            data = data.toString();
            output[type] += data;
            if (type !== 'error') {
                output.error += data;
            }
        };

        const closeHandler = code => {
            if (code === 0 || failOnError === false) {
                const result = code === 0 ? output.log : output.error;
                resolve({
                    success: code === 0,
                    output: result
                });
            } else {
                reject({
                    success: false,
                    output: output.error
                });
            }
        };

        process.stdout.on('data', processOutput('log'));
        process.stderr.on('data', processOutput('error'));
        process.on('error', error => {
            console.error(`Failed to run "${command} ${args.join(' ')}" in ${directory}. ${error}`);
            closeHandler(1);
        });
        process.on('close', closeHandler);
    });
};

module.exports = {
    run
};
