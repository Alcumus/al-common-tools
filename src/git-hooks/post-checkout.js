const [__previousHead, __newHead, branchCheckoutFlag] = process.argv.slice(2);
const wasBranchCheckout = branchCheckoutFlag === '1';

if (!wasBranchCheckout) {
    process.exit(0);
}

const exceptions = ['master'];

const { run } = require('../helpers/shell-helper.js');

const getCurrentBranch = async () => (await run({
    directory: process.cwd(),
    command: 'git',
    args: ['rev-parse', '--abbrev-ref', 'HEAD']
})).output.trim();

const getTicketNumberFromBranch = branchName => {
    const match = branchName.match(/^[A-Z]{2,3}-\d{1,4}/i);
    if (match) {
        return match[0];
    }
};

const printWarning = warning => {
    console.warn(`${'*'.repeat(80)}\n* ${warning}\n${'*'.repeat(80)}`);
};

const verifyBranchName = async (exceptions) => {
    const branchName = await getCurrentBranch();
    const ticketNumber = getTicketNumberFromBranch(branchName);
    if (!ticketNumber && !exceptions.includes(branchName)) {
        printWarning(`Branch ${branchName} does not follow the branch naming standard. Consider using <ticket-number>-<short-description> instead.`);
    } else if (ticketNumber && branchName.toLowerCase() === ticketNumber.toLowerCase()) {
        printWarning('No description provided. Consider adding a description to your branch name.');
    }
};

verifyBranchName(exceptions)
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
