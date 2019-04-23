#!/usr/bin/env node

const _ = require('lodash');
const fs = require('fs');
const branchHelper = require('./src/helpers/branch-helper');

const { runShellVerbose } = require('./run.js');

const series = async (...commands) => {
    for (const command of commands) {
        await runShellVerbose(...command);
    }
};

const execute = async () => {
    const currentBranch = await branchHelper.getCurrentBranch(__dirname);
    const branchName = branchHelper.getTicketNumberFromBranch(currentBranch);

    const packageJSON = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf8'));
    const currentVersion = _.get(packageJSON, 'version');

    let tagName = '';

    if (currentVersion.includes(branchName) && currentVersion.match(/.*[0-9]+-[0-9]+$/) ){
        tagName = currentVersion.replace(/\d+$/, (i) => parseInt(i) + 1);
    }
    else{
        tagName = currentVersion + '-' + branchName + '-1';
    }

    packageJSON.version = tagName;

    fs.writeFile(`${process.cwd()}/package.json`, JSON.stringify(packageJSON, null, 2), function(err) {
        if(err) {
            return console.error(err);
        }

        console.info('Package Json version updated to version ' + tagName);
    });
};

// execute()
//     .then(() => console.info('YAY'))
//     .catch(error => console.error('BOO', error));

series(
    ['git', 'update-index', '--refresh'],
    ['git', 'fetch'],
    ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
    // ['npm', 'publish', '--tag', tagName],
    //
    //
    // ['git', 'tag', '-am', `Release of version ${tagName}`, tagName],
    // ['npm', '--no-git-tag-version', 'version', ...versionArguments],
    // ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after release of version ${version}.`],
    // ['git', 'push'],
    // ['git', 'push', 'origin', tagName]
).catch(error => {
    console.error(error);
    process.exit(1);
});
