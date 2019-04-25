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

let newVersion = '';
let tagName = '';

const generateTagName = async () => {
    const currentBranch = await branchHelper.getCurrentBranch(__dirname);
    const branchName = branchHelper.getTicketNumberFromBranch(currentBranch);

    const packageJSON = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf8'));
    const currentVersion = _.get(packageJSON, 'version');

    if (currentVersion.includes(branchName) && currentVersion.match(/.*[0-9]+-[0-9]+$/) ){
        newVersion = currentVersion.replace(/\d+$/, (i) => parseInt(i) + 1);
    }
    else{
        newVersion = currentVersion + '-' + branchName + '-1';
    }

    packageJSON.version = newVersion;

    fs.writeFile(`${process.cwd()}/package.json`, JSON.stringify(packageJSON, null, 2), function(err) {
        if(err) {
            return console.error(err);
        }
        console.info('Package Json version updated to version ' + newVersion);
    });

    tagName = newVersion.substring(newVersion.indexOf('-')+1);

};

const setupGitBranch = async  () => {
    await series(
        // ['git', 'update-index', '--refresh'],
        ['git', 'fetch'],
        // ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
        ['git', 'merge', 'master']
    ).catch(error => {
        console.error(error);
        process.exit(1);
    });
};

const publishVersion = async  () => {
    await series (
        ['npm', 'publish', '--tag', tagName, '--registry', 'https://verdaccio.alcumus.local'],
        ['git', 'tag', '-am', `Release of version ${newVersion}`, tagName],
        ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after release of version ${newVersion}.`],
        ['git', 'push'],
        ['git', 'push', 'origin', tagName]
    ).catch(error => {
        console.error(error);
        process.exit(1);
    });
};

setupGitBranch()
    .then(() => generateTagName())
    .then(() => publishVersion())
    .then(() => console.info(`Publish was successful, please change your package.json to use al-hestia version ${newVersion}`))
    .catch(error => console.error('Publish was unsuccessful', error));

// series(
//     // ['git', 'update-index', '--refresh'],
//      ['git', 'fetch'],
//     // ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
//     ['git', 'merge', 'master']
// ).catch(error => {
//     console.error(error);
//     process.exit(1);
// }).then(() => generateTagName())
//     .then( () => {
//         series (
//             ['npm', 'publish', '--tag', tagName, '--registry', 'https://verdaccio.alcumus.local'],
//             ['git', 'tag', '-am', `Release of version ${newVersion}`, tagName],
//             ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after release of version ${newVersion}.`],
//             ['git', 'push'],
//             ['git', 'push', 'origin', tagName]
//         ).catch(error => {
//             console.error(error);
//             process.exit(1);
//         });
//     }).catch(error => console.error('Publish was unsuccessful', error));
