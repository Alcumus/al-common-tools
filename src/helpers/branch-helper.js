const JiraClient = require('jira-connector');
const promisify = require('util').promisify;
const _ = require('lodash');
const shellHelper = require('./shell-helper.js');

const jiraHost = 'cfexttkt02.alcumusgroup.net/jira';
const jiraIssueBaseUrl = `https://${jiraHost}/browse`;

const run = (...args) => shellHelper.run(...args);

const getJira = config => {
    const jira = new JiraClient({
        host: jiraHost,
        basic_auth: config
    });
    jira.issue.getIssue = promisify(jira.issue.getIssue);
    return jira;
};

const getCurrentBranch = async (directory) => await run({
    directory,
    failOnError: true,
    command: 'git',
    args: ['symbolic-ref', '--short',  'HEAD']
}).then(result => _.get(result, 'output', '').trim());

const getJiraDescription = async (config, issueKey, maxCharacters = null) => {
    const jira = getJira(config);
    try {
        const issue = await jira.issue.getIssue({
            issueKey,
            fields: ['description']
        });
        if (_.isNumber(maxCharacters)) {
            return _.truncate(issue.fields.description, { length: maxCharacters });
        } else {
            return issue.fields.description;
        }
    } catch (error) {
        console.error('Failed to load JIRA description.');
        console.error(error);
    }
};

const getJiraUrlFromIssueNumber = (issueNumber) => `${jiraIssueBaseUrl}/${issueNumber}`;

const getTicketNumberFromBranch = (currentBranch) => {
    const match = /^[A-Z]{2,3}-\d{1,4}/i.exec(currentBranch);
    if (match) {
        return match[0].toUpperCase();
    }
    return undefined;
};

const runLinting = async ({ directory, failOnError = true }) => {
    return await run({
        directory,
        failOnError,
        command: 'npm',
        args: ['run', 'lint']
    });
};

const runCodeCoverage = async ({ directory, failOnError = false }) => {
    return await run({
        directory,
        failOnError,
        command: 'npm',
        args: ['run', 'coverage']
    });
};

const changeBranch = async (directory, targetBranch) => {
    await run({
        directory,
        failOnError: true,
        command: 'git',
        args: ['checkout', targetBranch]
    });
};

const runOnBranch = targetToRun => async (directory, branch, failOnError) => {
    await changeBranch(directory, branch);
    return await targetToRun({ directory, failOnError });
};

const verifyLintingOnBranch = runOnBranch(runLinting);
const codeCoverageOnBranch = runOnBranch(runCodeCoverage);

const verifyLinting = async (directory, sourceBranch, destinationBranch) => {
    return {
        destination: await publicFunctions.verifyLintingOnBranch(directory, `origin/${destinationBranch}`, false),
        source: await publicFunctions.verifyLintingOnBranch(directory, sourceBranch, true)
    };
};

const codeCoverage = async (directory, sourceBranch, destinationBranch) => {
    return {
        destinationCoverage: (await publicFunctions.codeCoverageOnBranch(directory, `origin/${destinationBranch}`, false)).output,
        sourceCoverage: (await publicFunctions.codeCoverageOnBranch(directory, sourceBranch, false)).output
    };
};

const publicFunctions = {
    getCurrentBranch,
    getJiraDescription,
    getJiraUrlFromIssueNumber,
    getTicketNumberFromBranch,
    verifyLinting,
    verifyLintingOnBranch,
    codeCoverage,
    codeCoverageOnBranch
};

module.exports = publicFunctions;
