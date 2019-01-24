/* globals describe, it, beforeEach, afterEach */

const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const shellHelper = require('../../src/helpers/shell-helper.js');

const prepareOutput = ({ shellHelper, output, match = {} }) => {
    const matchingParameters = sinon.match({
        directory: match.directory || sinon.match.any,
        command: match.command || sinon.match.any,
        args: match.args || sinon.match.any
    });
    shellHelper.run.withArgs(matchingParameters).returns(
        Promise.resolve({
            success: true,
            output
        })
    );
};

describe('Change processor', () => {
    let changeProcessor;
    let output;

    beforeEach(() => {
        sinon.stub(shellHelper, 'run');
        changeProcessor = proxyquire('../../src/pull-request/change-processor.js', {
            '../helpers/shell-helper.js': shellHelper
        });

        output = {
            containingTagChange: '-return "tag";\n+return <tag/>',
            noTagChange: '-sample text\n+different text'
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#processChanges', () => {
        const argsIncludes = argument => sinon.match(args => args.includes(argument));

        const prepareChangedFiles = files => {
            prepareOutput({
                shellHelper,
                output: files.join('\n'),
                match: {
                    command: 'git',
                    args: argsIncludes('--name-only')
                }
            });
        };

        it('should detect a <tag change in a .js file and set jsxChanged to true', () => {
            prepareChangedFiles(['src/file.js']);
            prepareOutput({
                shellHelper,
                output: output.containingTagChange,
                match: {
                    args: ['diff', 'origin/dest..source', '--', 'src/file.js']
                }
            });

            return changeProcessor({ sourceBranch: 'source', destinationBranch: 'dest' })
                .then(changes => {
                    expect(changes).to.include({
                        jsxChanged: true
                    });
                });
        });

        it('should not detect a <tag change in a .json file and set jsxChanged to false', () => {
            prepareChangedFiles(['src/file.json']);
            prepareOutput({
                shellHelper,
                output: output.containingTagChange,
                match: {
                    args: ['diff', 'origin/dest..source', '--', 'src/file.json']
                }
            });

            return changeProcessor({ sourceBranch: 'source', destinationBranch: 'dest' })
                .then(changes => {
                    expect(changes).to.include({
                        jsxChanged: false
                    });
                });
        });

        it('should return a list of changed files', () => {
            const changedFiles = ['file1', 'file2', 'file3'];
            prepareChangedFiles(changedFiles);
            prepareOutput({ shellHelper, output: '', match: { args: argsIncludes('--') } });

            return changeProcessor({ sourceBranch: 'source', destinationBranch: 'dest' })
                .then(changes => {
                    expect(changes).to.deep.include({
                        changedFiles
                    });
                });
        });

        it('should return a list of raw diffs by file', () => {
            const changedFiles = ['file1', 'file2', 'file3'];
            prepareChangedFiles(changedFiles);
            changedFiles.forEach((file, index) => {
                prepareOutput({ shellHelper, output: `diff${index + 1}`, match: { args: argsIncludes(file) } });
            });

            return changeProcessor({ sourceBranch: 'source', destinationBranch: 'dest' })
                .then(changes => {
                    expect(changes).to.deep.include({
                        diffByFile: {
                            file1: 'diff1',
                            file2: 'diff2',
                            file3: 'diff3'
                        }
                    });
                });
        });
    });
});
