const util = require('util');
const titleCase = require('title-case');
const _ = require('lodash');
const pullRequests = require('../../pull-request/pull-requests.service');
const branchHelper = require('../../helpers/branch-helper');
const changeProcessor = require('../../pull-request/change-processor');
const checklists = require('../../pull-request/checklists');

const maxDescriptionLength = 80;

const getCurrentBranch = async () => await branchHelper.getCurrentBranch(process.cwd());

const getDefaultTitle = async () => titleCase(await getCurrentBranch());

const prepareForMarkdown = string => string.replace(/\n/g, ' ');

const getDefaultDescription = async ({ cliParameters, bitbucketSession, repositorySlug }) => {
    const branchCommits = await bitbucketSession.getBranchCommitMessages({
        owner: cliParameters.owner,
        repositorySlug,
        sourceBranch: cliParameters.sourceBranch,
        destinationBranch: cliParameters.destinationBranch
    });
    const ticketNumber = branchHelper.getTicketNumberFromBranch();
    let ticketDescription = '';
    if (ticketNumber) {
        const username = _.get(cliParameters, 'jira.username');
        const password = _.get(cliParameters, 'jira.password');
        if (!_.isEmpty(username) && !_.isEmpty(password)) {
            const jiraLink = await branchHelper.getJiraUrlFromIssueNumber(ticketNumber);
            if (jiraLink) {
                ticketDescription += `Jira: [${ticketNumber}](${jiraLink})\n\n`;
            }
            const jiraDescription = (await branchHelper.getJiraDescription(cliParameters.jira, ticketNumber, maxDescriptionLength) || '');
            if (jiraDescription.length > 0) {
                ticketDescription += `${jiraDescription}\n\n`;
            }
        }
    }
    ticketDescription += '### Commits:\n';
    ticketDescription += branchCommits.map(prepareForMarkdown).map(commit => `* ${commit}`).join('\n');
    return ticketDescription;
};

const prepareCliParameters = async (cliParameters) => {
    cliParameters.workingDirectory = process.cwd();
    for (const [key, value] of Object.entries(cliParameters)) {
        if (value instanceof Promise) {
            cliParameters[key] = await value;
        }
    }
    const summary = (cliParameters.summary || []).concat(cliParameters._);
    if (!_.isEmpty(summary)) {
        cliParameters.summary = `### Summary:\n\n${summary.join(' ')}\n\n`;
    }
};

const verifyProjectState = async (cliParameters) => {
    const linting = await branchHelper.verifyLinting(cliParameters.workingDirectory, cliParameters.sourceBranch, cliParameters.destinationBranch);
    const coverage = await branchHelper.codeCoverage(cliParameters.workingDirectory, cliParameters.sourceBranch, cliParameters.destinationBranch);
    return {
        linting,
        coverage
    };
};

const summariseResults = (type, results) => {
    let summary = '';
    results = results.linting[type];
    if (results.success) {
        summary += 'Passed linting.\n\n';
    } else {
        const code = '\n```\n';
        summary += 'Did _not_ pass linting!\n\n';
        summary += `${code}${results.output}${code}\n\n`;
    }
    return summary;
};

const getSummaryFromVerificationResults = results => {
    let summary = '### Before PR:\n';
    summary += summariseResults('destination', results);
    summary += '\n### After PR:\n';
    summary += summariseResults('source', results);
    return summary;
};

const getReviewerNames = reviewerIds => {
    const teams = _.flatten(Object.values(require('../../../test/teams.json')));
    return reviewerIds.map(reviewerId => {
        const reviewer = teams.find(teamMember => teamMember.uuid === reviewerId.uuid);
        return _.get(reviewer, 'displayName', reviewerId);
    });
};

const createPullRequest = async (cliParameters) => {
    await prepareCliParameters(cliParameters);
    const verificationResults = await verifyProjectState(cliParameters);
    const verificationSummary = getSummaryFromVerificationResults(verificationResults);

    const session = pullRequests.authenticate(cliParameters.bitbucket);
    const reviewers = await session.getUserIds(cliParameters.reviewers, cliParameters.bitbucket.username);
    const projectName = cliParameters.workingDirectory.replace(/.*\//, '');
    const repositorySlug = await session.getRepositorySlug(cliParameters.owner, projectName);

    const pullRequest = {
        dryRun: cliParameters.dryRun,
        owner: cliParameters.owner,
        title: cliParameters.title,
        repositorySlug,
        sourceBranch: cliParameters.sourceBranch,
        destinationBranch: cliParameters.destinationBranch,
        reviewers,
        description: (cliParameters.summary || '')
            + await getDefaultDescription({ bitbucketSession: session, cliParameters, repositorySlug })
            + `\n\n${verificationSummary}`
    };

    const [request, result] = await session.createPullRequest(pullRequest);
    if (cliParameters.dryRun) {
        request._body.reviewers = getReviewerNames(request._body.reviewers);
        console.info('Would have created PR', util.inspect(request, { depth: 10, colors: true }));
    } else {
        console.info('Created PR', _.get(result, 'data.links.html.href'));
        console.info('Invited reviewers:\n', getReviewerNames(request._body.reviewers).join('\n'));
    }
    return result;
};

const getCommentTextFromChecklist = (checklist, tasks) => {
    tasks = tasks
        .map(task => `  * ${task}`)
        .join('\n');
    return `### Review Checklist: ${checklist}\n${tasks}`;
};

const createChecklists = _.curry((session, pullRequest, dryRun, checklists) => {
    return Promise.all(
        Object.entries(checklists).map(([checklist, tasks]) => session.createComment({
            pullRequest,
            message: getCommentTextFromChecklist(checklist, tasks),
            dryRun
        }))
    ).then(result => {
        if (dryRun) {
            console.info('Would have the following checklists:\n', util.inspect(result, { depth: 10, colors: true }));
        } else if (Object.keys(checklists).length > 0) {
            console.info('Added checklists:\n', Object.keys(checklists).map(name => `  - ${name}`).join('\n'));
        }
    });
});

const addChecklists = _.curry((cliParameters, pullRequest) => {
    const session = pullRequests.authenticate(cliParameters.bitbucket);
    return Promise.all([
        checklists.init(),
        changeProcessor({ directory: cliParameters.workingDirectory, sourceBranch: cliParameters.sourceBranch, destinationBranch: cliParameters.destinationBranch })
    ])
        .then(([getChecklists, changes]) => getChecklists({ args: cliParameters, ...changes }))
        .then(createChecklists(session, pullRequest, cliParameters.dryRun));
});

const printErrors = error => {
    if (error.output) {
        console.error(error.output);
    } else {
        console.error(util.inspect(error, { depth: 10 }));
    }
};

module.exports = {
    command: 'create',
    aliases: ['*', 'c'],
    describe: 'Create a new pull request.',
    builder: {
        title: {
            alias: 't',
            default: getDefaultTitle,
            defaultDescription: 'current branch',
            describe: 'Review title.'
        },
        reviewers: {
            alias: 'r',
            type: 'array',
            default: [],
            defaultDescription: 'none',
            describe: 'Reviewers to add. This will be matched against full names, usernames, and teams. E.g., pippin will mach all users on team Pippin. Integers will be interpreted as that number of random reviewers.'
        },
        source: {
            alias: ['source-branch', 's'],
            default: getCurrentBranch,
            defaultDescription: 'current branch',
            describe: 'The source branch to create the pull request from.'
        },
        destination: {
            alias: ['destination-branch', 'd'],
            default: 'master',
            describe: 'The destination branch to create the pull request to.'
        },
        owner: {
            alias: 'o',
            default: 'alcumusit',
            describe: 'The owner of the repository.'
        },
        summary: {
            alias: ['description', 'desc'],
            type: 'array',
            defaultDescription: 'A simple description with a link to the JIRA ticket if found.',
            describe: 'The summary to set for the pull request (markdown can be used, it will be placed under a summary header).'
        },
        dryRun: {
            alias: 'dry-run',
            type: 'boolean',
            describe: 'If --dry-run is present, the pull request will not be created.'
        }
    },
    handler: cliParameters => createPullRequest(cliParameters)
        .then(addChecklists(cliParameters))
        .catch(printErrors)
};
