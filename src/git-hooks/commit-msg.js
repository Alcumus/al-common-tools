const { run } = require('../helpers/shell-helper.js');
const fs = require('fs');
const promisify = require('util').promisify;

fs.readFile = promisify(fs.readFile);
fs.writeFile = promisify(fs.writeFile);

const commitMessageFile = process.argv[2];

const getBranchName = async () => run({
    directory: process.cwd(),
    command: 'git',
    args: ['rev-parse', '--abbrev-ref', 'HEAD']
});

const getCommitMessage = async () => (await fs.readFile(commitMessageFile)).toString().trim();

const writeCommitMessage = async (commitMessage) => fs.writeFile(commitMessageFile, commitMessage);

const verifyCommitMessage = async () => {
    const commitMessage = await getCommitMessage();
    const branchName = (await getBranchName()).output.trim();
    const branchMatch = branchName.match(/[A-Z]{2,3}-\d{1,4}/i);
    if (branchMatch) {
        const ticketNumber = branchMatch[0].toUpperCase();
        if (!commitMessage.match(new RegExp(ticketNumber, 'i'))) {
            const newCommitMessage = `${ticketNumber}: ${commitMessage}`;
            await writeCommitMessage(newCommitMessage);
        }
    }
};

verifyCommitMessage()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
