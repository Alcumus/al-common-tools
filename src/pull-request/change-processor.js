const _ = require('lodash');
const run = require('../helpers/shell-helper.js').run;

const containsJsxChanges = diff => !_.isEmpty(diff.match(/<[a-z]+|<>/i));

const jsxChanged = ({ data }) => ({
    jsxChanged: data.changedFiles.filter(changedFile => changedFile.match(/^src\/.*\.js$/))
        .some(jsFile => containsJsxChanges(data.diffByFile[jsFile]))
});

const dataChangedFiles = ({ directory, sourceBranch, destinationBranch }) => {
    return run({
        directory,
        command: 'git',
        args: ['diff', `origin/${destinationBranch}..${sourceBranch}`, '--name-only']
    }).then(result => ({
        changedFiles: result.output.split('\n').filter(_.negate(_.isEmpty))
    }));
};

const dataDiffPerFile = ({ directory, sourceBranch, destinationBranch, data }) => {
    return reduceWithPromise(data.changedFiles, (accumulator, changedFile) => {
        return run({
            directory,
            command: 'git',
            args: ['diff', `origin/${destinationBranch}..${sourceBranch}`, '--', changedFile]
        }).then(result => _.merge(accumulator, {
            diffByFile: {
                [changedFile]: result.output
            }
        }));
    }, {});
};

const dataGatherers = [
    dataChangedFiles,
    dataDiffPerFile
];

const processors = [
    jsxChanged
];

const reduceWithPromise = (array, reduceCallback, accumulator) => {
    return array.reduce((promiseChain, ...rest) => {
        return promiseChain.then(accumulator => {
            return reduceCallback(accumulator, ...rest);
        });
    }, Promise.resolve(accumulator));
};

const processChanges = ({ directory = '.', sourceBranch = '@', destinationBranch = 'master' } = {}) => {
    return reduceWithPromise(dataGatherers, (accumulator, dataGatherer) => {
        return dataGatherer({ directory, sourceBranch, destinationBranch, data: accumulator })
            .then(data => _.merge(accumulator, data));
    }, {})
        .then(data => {
            return processors.reduce((accumulator, processor) => _.merge(accumulator, processor({ directory, sourceBranch, destinationBranch, data })), Object.assign({}, data));
        });
};

module.exports = processChanges;
