/* globals describe, it, afterEach */

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const shellHelper = require('../../src/helpers/shell-helper.js');
const unitTestHelper = require('../unit-test-helper.js')(sinon);

describe('Post checkout git hook', () => {
    const expectWarning = (branchName, expectedWarning = null, branchCheckoutFlag = '1') => () => {
        return new Promise((resolve, reject) => {
            const branchCheckoutFlagIndex = 4;
            process.argv[branchCheckoutFlagIndex] = branchCheckoutFlag;

            if (expectedWarning === null) {
                sinon.mock(console).expects('warn').never();
            } else {
                sinon.mock(console).expects('warn')
                    .withExactArgs(sinon.match(expectedWarning));
            }

            sinon.stub(shellHelper, 'run').returns(Promise.resolve({ output: branchName }));
            sinon.stub(process, 'exit').callsFake(unitTestHelper.verifyAndCheckResult(resolve, reject, 0));

            proxyquire('../../src/git-hooks/post-checkout.js', {
                '../helpers/shell-helper.js': shellHelper
            });
        });
    };

    afterEach(() => {
        sinon.restore();
    });

    ['HF-1', 'hf-10', 'AA-100', 'zz-1000', 'abc-9999'].forEach(ticketNumber => {
        it(`should not warn about branch that starts with ${ticketNumber}`, expectWarning(`${ticketNumber}-description`));

        it(`should warn about the description missing if the branch name is equal to ${ticketNumber}`, expectWarning(ticketNumber, /No description provided/i));
    });

    it('should not warn about master', expectWarning('master'));

    it('should not warn when it\'s not a branch checkout', expectWarning('test', null, '0'));

    ['test', 'abcd-1234', 'abc1', 'gir', 'taco'].forEach(branchName => {
        it('should warn about the ticket number missing from the branch name', expectWarning(branchName, /<ticket-number>/i));
    });
});
