/* globals describe, it, afterEach */

const _ = require('lodash');
const fs = require('fs');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const shellHelper = require('../../src/helpers/shell-helper.js');
const unitTestHelper = require('../unit-test-helper.js')(sinon);

describe('Commit message git hook', () => {
    const expectNewCommitMessage = ({ branchName, commitMessage, expectedNewCommitMessage }) => {
        return new Promise((resolve, reject) => {
            const commitFileName = 'dummy-commit-file';
            process.argv[2] = commitFileName;
            sinon.stub(shellHelper, 'run').returns(Promise.resolve({ output: branchName }));
            sinon.stub(fs, 'readFile').yields(null, commitMessage);
            if (commitMessage === expectedNewCommitMessage) {
                sinon.mock(fs).expects('writeFile').never();
            } else {
                sinon.mock(fs).expects('writeFile')
                    .withExactArgs(commitFileName, expectedNewCommitMessage, sinon.match.func)
                    .yields();
            }
            sinon.stub(process, 'exit').callsFake(status => {
                if (status === 0) {
                    resolve();
                } else {
                    reject();
                }
            });
            proxyquire('../../src/git-hooks/commit-msg.js', {
                fs,
                '../helpers/shell-helper.js': shellHelper
            });
        }).then(sinon.verify);
    };

    afterEach(() => {
        sinon.restore();
    });

    ['HF-1', 'hf-10', 'AA-100', 'zz-1000', 'abc-9999'].forEach(ticketNumber => {
        it(`should make no changes when the branch and commit message starts with ticket number ${ticketNumber}`, () => {
            const commitMessage = `${ticketNumber}: commit message`;
            return expectNewCommitMessage({ branchName: `${ticketNumber}-description`, commitMessage, expectedNewCommitMessage: commitMessage });
        });

        it(`should prepend the ticket number ${ticketNumber} when the commit message does not contain it`, () => {
            const commitMessage = 'commit message';
            return expectNewCommitMessage({ branchName: `${ticketNumber}-description`, commitMessage, expectedNewCommitMessage: `${ticketNumber.toUpperCase()}: ${commitMessage}` });
        });
    });

    it('should not change the commit message when the branch does not contain a ticket number', () => {
        return expectNewCommitMessage({ branchName: 'some-branch', commitMessage: 'commit', expectedNewCommitMessage: 'commit' });
    });

    it('should read the commit message from the file provided as the third parameter (after node and itself)', () => {
        process.argv[2] = 'commit-file-name-to-use';
        sinon.stub(shellHelper, 'run').returns(Promise.resolve({ output: '' }));
        sinon.mock(fs).expects('readFile')
            .withExactArgs(process.argv[2], sinon.match.func)
            .yields(null, 'branch');
        return new Promise((resolve, reject) => {
            sinon.stub(process, 'exit').callsFake(unitTestHelper.verifyAndCheckResult(resolve, reject, 0));
            proxyquire('../../src/git-hooks/commit-msg.js', {
                fs,
                '../helpers/shell-helper.js': shellHelper
            });
        });
    });

    it('should write the commit message to the file provided as the third parameter (after node and itself)', () => {
        process.argv[2] = 'commit-file-name-to-use';
        sinon.stub(shellHelper, 'run').returns(Promise.resolve({ output: 'hf-99' }));
        sinon.stub(fs, 'readFile').yields(null, 'commit');
        sinon.mock(fs).expects('writeFile')
            .withExactArgs(process.argv[2], 'HF-99: commit', sinon.match.func)
            .yields();
        return new Promise((resolve, reject) => {
            sinon.stub(process, 'exit').callsFake(unitTestHelper.verifyAndCheckResult(resolve, reject, 0));
            proxyquire('../../src/git-hooks/commit-msg.js', {
                fs,
                '../helpers/shell-helper.js': shellHelper
            });
        });
    });

    it('should exit with a status of 1 if there is an error', () => {
        sinon.stub(shellHelper, 'run').returns(Promise.reject());
        sinon.stub(fs, 'readFile').yields(null, '');
        return new Promise((resolve, reject) => {
            sinon.stub(process, 'exit').callsFake(status => status === 1 ? resolve() : reject(`Received exit code of ${status}, expected 1.`));
            proxyquire('../../src/git-hooks/commit-msg.js', {
                fs,
                '../helpers/shell-helper.js': shellHelper
            });
        });
    });
});
