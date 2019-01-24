/* globals describe, it, beforeEach, afterEach */

const expect = require('chai').expect;
const JiraClient = require('jira-connector');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const shellHelper = require('../../src/helpers/shell-helper.js');
const unitTestHelper = require('../unit-test-helper.js')(sinon);

describe('Branch helper', () => {
    let branchHelper;
    let jiraClient;

    beforeEach(() => {
        jiraClient = new JiraClient({ host: 'fake' });

        branchHelper = proxyquire('../../src/helpers/branch-helper.js', {
            './shell-helper.js': shellHelper,
            'jira-connector': unitTestHelper.replaceConstructor(jiraClient)
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#getCurrentBranch', () => {
        it('should return a promise that resolves to the branch as returned by git symbolic-ref', () => {
            sinon.stub(shellHelper, 'run').withArgs(sinon.match({ args: unitTestHelper.matchers.includes('symbolic-ref', 'HEAD') }))
                .returns(Promise.resolve({ success: true, output: 'branch' }));

            return branchHelper.getCurrentBranch()
                .then(result => expect(result).to.equal('branch'));
        });

        it('should trim linebreaks from the branch name', () => {
            sinon.stub(shellHelper, 'run').withArgs(sinon.match({ args: unitTestHelper.matchers.includes('symbolic-ref', 'HEAD') }))
                .returns(Promise.resolve({ success: true, output: 'branch\n' }));

            return branchHelper.getCurrentBranch()
                .then(result => expect(result).to.equal('branch'));
        });

        it('should run the git command in the provided directory', () => {
            const directory = 'gir';
            sinon.mock(shellHelper).expects('run').withArgs(sinon.match({ directory }))
                .returns(Promise.resolve({}));

            return branchHelper.getCurrentBranch(directory);
        });

        it('should return a promise that rejects if the git command fails', () => {
            sinon.stub(shellHelper, 'run').returns(Promise.reject('error'));

            return branchHelper.getCurrentBranch()
                .then(() => expect.fail('Promise should not have resolved!'))
                .catch(error => expect(error).to.equal('error'));
        });
    });

    describe('#getJiraDescription', () => {
        const jiraDescription = description => ({
            fields: { description }
        });

        it('should get ticket description from Jira client', () => {
            sinon.stub(jiraClient.issue, 'getIssue').yields(null, jiraDescription('ticket description'));

            return branchHelper.getJiraDescription({}, 'IS-666')
                .then(result => expect(result).to.equal('ticket description'));
        });

        it('should pass the ticket number to the Jira client', () => {
            sinon.mock(jiraClient.issue).expects('getIssue')
                .withArgs(sinon.match({
                    issueKey: 'IS-666',
                    fields: unitTestHelper.matchers.includes('description')
                }))
                .yields(null, jiraDescription('ticket description'));

            return branchHelper.getJiraDescription({}, 'IS-666')
                .then(sinon.verify);
        });

        it('should log an error, but not reject the returned promise if an error occurs in fetching the Jira description', () => {
            sinon.stub(jiraClient.issue, 'getIssue').yields('error');
            sinon.mock(console).expects('error').atLeast(1);

            return branchHelper.getJiraDescription()
                .then(() => sinon.verify());
        });

        it('should truncate the description if it is more than maxCharacters long', () => {
            sinon.stub(jiraClient.issue, 'getIssue').yields(null, jiraDescription('ticket description'));

            return branchHelper.getJiraDescription({}, 'IS-666', 9)
                .then(result => expect(result).to.equal('ticket...'));
        });
    });

    describe('#getTicketNumberFromBranch', () => {
        it('should read the ticket number from the start of the branch name', () => {
            expect(branchHelper.getTicketNumberFromBranch('MK-101-ticket-description')).to.equal('MK-101');
        });

        it('should handle lowercase ticket numbers', () => {
            expect(branchHelper.getTicketNumberFromBranch('mk-101-ticket-description')).to.equal('MK-101');
        });

        it('should handle single digit ticket numbers', () => {
            expect(branchHelper.getTicketNumberFromBranch('MK-9-ticket-description')).to.equal('MK-9');
        });

        it('should handle 4 digit ticket numbers', () => {
            expect(branchHelper.getTicketNumberFromBranch('MK-1010-ticket-description')).to.equal('MK-1010');
        });

        it('should return undefined if nothing matching a ticket number is at the start', () => {
            expect(branchHelper.getTicketNumberFromBranch('ticket-description-MK-101')).to.be.undefined;
        });
    });

    describe('#verifyLintingOnBranch', () => {
        it('should change branch of the provided directory', () => {
            const directory = './test';
            const mock = sinon.mock(shellHelper);

            mock.expects('run')
                .withExactArgs(sinon.match({
                    directory,
                    command: 'git',
                    args: unitTestHelper.matchers.includes('checkout', 'branch')
                }))
                .once()
                .returns(Promise.resolve({}));
            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'npm' }), Promise.resolve());

            return branchHelper.verifyLintingOnBranch(directory, 'branch', false)
                .then(sinon.verify);
        });

        it('should execute npm run lint in the provded directory', () => {
            const directory = './test';
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    directory,
                    command: 'npm',
                    args: unitTestHelper.matchers.includes('run', 'lint')
                }))
                .once()
                .returns(Promise.resolve({}));

            return branchHelper.verifyLintingOnBranch(directory, 'branch', false)
                .then(sinon.verify);
        });

        it('should not fail on linting error if failOnError is false', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'npm',
                    failOnError: false
                }));

            return branchHelper.verifyLintingOnBranch('', '', false)
                .then(sinon.verify);
        });

        it('should fail on linting error if failOnError is true', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'npm',
                    failOnError: true
                }));

            return branchHelper.verifyLintingOnBranch('', '', true)
                .then(sinon.verify);
        });

        it('should fail on error changing branch even if failOnError is false', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'npm' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'git',
                    failOnError: true
                }));

            return branchHelper.verifyLintingOnBranch('', '', false)
                .then(sinon.verify);
        });
    });

    describe('#verifyLinting', () => {
        it('should run verifyLintingOnBranch for both source branch and destination branch matching the results to the return object', () => {
            sinon.stub(branchHelper, 'verifyLintingOnBranch')
                .withArgs(sinon.match.any, 'origin/destination')
                .returns(Promise.resolve('destinationResult'));
            branchHelper.verifyLintingOnBranch
                .withArgs(sinon.match.any, 'source')
                .returns(Promise.resolve('sourceResult'));

            return branchHelper.verifyLinting('.', 'source', 'destination')
                .then(result => expect(result).to.deep.equal({
                    destination: 'destinationResult',
                    source: 'sourceResult'
                }));
        });

        it('should tell verifyLintingOnBranch to not fail on error for destination branch', () => {
            const mock = sinon.mock(branchHelper);
            mock
                .expects('verifyLintingOnBranch')
                .withArgs('.', 'origin/destination', false)
                .returns(Promise.resolve());
            unitTestHelper.allowCalls(mock, 'verifyLintingOnBranch', ['.', 'source'], Promise.resolve());

            return branchHelper.verifyLinting('.', 'source', 'destination')
                .then(sinon.verify);
        });

        it('should tell verifyLintingOnBranch to fail on error for source branch', () => {
            const mock = sinon.mock(branchHelper);
            mock
                .expects('verifyLintingOnBranch')
                .withArgs('.', 'source', true)
                .returns(Promise.resolve());
            unitTestHelper.allowCalls(mock, 'verifyLintingOnBranch', ['.', 'origin/destination'], Promise.resolve());

            return branchHelper.verifyLinting('.', 'source', 'destination')
                .then(sinon.verify);
        });
    });

    describe('#codeCoverageOnBranch', () => {
        it('should change branch of the provided directory', () => {
            const directory = './test';
            const mock = sinon.mock(shellHelper);

            mock.expects('run')
                .withExactArgs(sinon.match({
                    directory,
                    command: 'git',
                    args: unitTestHelper.matchers.includes('checkout', 'branch')
                }))
                .once()
                .returns(Promise.resolve({}));
            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'npm' }), Promise.resolve());

            return branchHelper.codeCoverageOnBranch(directory, 'branch', false)
                .then(sinon.verify);
        });

        it('should execute npm run coverage in the provded directory', () => {
            const directory = './test';
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    directory,
                    command: 'npm',
                    args: unitTestHelper.matchers.includes('run', 'coverage')
                }))
                .once()
                .returns(Promise.resolve({}));

            return branchHelper.codeCoverageOnBranch(directory, 'branch', false)
                .then(sinon.verify);
        });

        it('should not fail on coverage error if failOnError is false', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'npm',
                    failOnError: false
                }));

            return branchHelper.codeCoverageOnBranch('', '', false)
                .then(sinon.verify);
        });

        it('should fail on coverage error if failOnError is true', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'git' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'npm',
                    failOnError: true
                }));

            return branchHelper.codeCoverageOnBranch('', '', true)
                .then(sinon.verify);
        });

        it('should fail on error changing branch even if failOnError is false', () => {
            const mock = sinon.mock(shellHelper);

            unitTestHelper.allowCalls(mock, 'run', sinon.match({ command: 'npm' }), Promise.resolve());
            mock.expects('run')
                .withExactArgs(sinon.match({
                    command: 'git',
                    failOnError: true
                }));

            return branchHelper.codeCoverageOnBranch('', '', false)
                .then(sinon.verify);
        });
    });

    describe('#codeCoverage', () => {
        it('should run codeCoverageOnBranch for both source branch and destination branch matching the results to the return object', () => {
            sinon.stub(branchHelper, 'codeCoverageOnBranch')
                .withArgs(sinon.match.any, 'origin/destination')
                .returns(Promise.resolve({ output: 'destinationResult' }));
            branchHelper.codeCoverageOnBranch
                .withArgs(sinon.match.any, 'source')
                .returns({ output: 'sourceResult' });

            return branchHelper.codeCoverage('.', 'source', 'destination')
                .then(result => expect(result).to.deep.equal({
                    destinationCoverage: 'destinationResult',
                    sourceCoverage: 'sourceResult'
                }));
        });

        it('should tell codeCoverageOnBranch to not fail on error for destination branch', () => {
            const mock = sinon.mock(branchHelper);
            mock
                .expects('codeCoverageOnBranch')
                .withArgs('.', 'origin/destination', false)
                .returns(Promise.resolve({}));
            unitTestHelper.allowCalls(mock, 'codeCoverageOnBranch', ['.', 'source'], Promise.resolve({}));

            return branchHelper.codeCoverage('.', 'source', 'destination')
                .then(sinon.verify);
        });

        it('should tell codeCoverageOnBranch to not fail on error for source branch', () => {
            const mock = sinon.mock(branchHelper);
            mock
                .expects('codeCoverageOnBranch')
                .withArgs('.', 'source', false)
                .returns(Promise.resolve({}));
            unitTestHelper.allowCalls(mock, 'codeCoverageOnBranch', ['.', 'origin/destination'], Promise.resolve({}));

            return branchHelper.codeCoverage('.', 'source', 'destination')
                .then(sinon.verify);
        });
    });
});
