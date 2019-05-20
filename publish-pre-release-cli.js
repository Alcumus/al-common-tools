#!/usr/bin/env node

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const branchHelper = require('./src/helpers/branch-helper');
const { runShellVerbose } = require('./run.js');

const series = async (...commands) => {
    for (const command of commands) {
        await runShellVerbose(...command);
    }
};

let newVersion = '';
let tagName = '';
const packageJsonPath = `${process.cwd()}/package.json`;
const packageJSON = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const generateTagName = async () => {
    const currentBranch = await branchHelper.getCurrentBranch(__dirname);
    const branchName = branchHelper.getTicketNumberFromBranch(currentBranch);

    const currentVersion = _.get(packageJSON, 'version');

    if (currentVersion.includes(branchName) && currentVersion.match(/.*[0-9]+-[0-9]+$/) ){
        newVersion = currentVersion.replace(/\d+$/, (i) => parseInt(i) + 1);
    }
    else{
        newVersion = currentVersion + '-' + branchName + '-1';
    }

    tagName = newVersion.substring(newVersion.indexOf('-')+1);
};

const updateJSONVersion = () => {
    packageJSON.version = newVersion;

    fs.writeFile(packageJsonPath, JSON.stringify(packageJSON, null, 2).concat('\n'), function(err) {
        if(err) {
            return console.error(err);
        }
        console.info('Package Json version updated to version ' + newVersion);
    });
};

const setupGitBranch = async () => {
    await series(
        ['git', 'update-index', '--refresh'],
        ['git', 'fetch'],
        ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
        ['git', 'merge', 'master']
    ).catch(error => {
        console.error(error);
        process.exit(1);
    });
};

const publishVersion = async () => {
    var npmcmd = 'npm'
    if(os.platform() === 'win32'){
       var npmcmd = 'npm.cmd'
    }
    await series (
        [npmcmd, 'publish', '--tag', tagName],
        ['git', 'tag', '-am', `Pre-release of version ${newVersion}`, tagName],
        ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after pre-release of version ${newVersion}.`],
        ['git', 'push'],
        ['git', 'push', 'origin', tagName]
    );
};

const rollBack = async () => {
    await series (
        ['git', 'reset', '--hard', `origin/${await branchHelper.getCurrentBranch(__dirname)}`],
        ['git', 'tag', '-d', tagName]
    ).catch(error => {
        console.error(error);
        process.exit(1);
    });
};

setupGitBranch()
    .then(() => generateTagName())
    .then(() => updateJSONVersion())
    .then(() => publishVersion())
    .then(() => console.info(`Publish was successful, ${newVersion}`))
    .catch(async (error) => {
        console.error('Publish was unsuccessful', error);
        await rollBack();
        console.error('Completed rollback after error', error);
    });
