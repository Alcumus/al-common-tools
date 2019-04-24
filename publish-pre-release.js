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

let tagName = '';
let ticketAndVersion = '';

const generateTagName = async () => {
    const currentBranch = await branchHelper.getCurrentBranch(__dirname);
    const branchName = branchHelper.getTicketNumberFromBranch(currentBranch);

    const packageJSON = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf8'));
    const currentVersion = _.get(packageJSON, 'version');

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

    ticketAndVersion = tagName.substring(tagName.indexOf('-')+1);

};

series(
    // ['git', 'update-index', '--refresh'],
    // ['git', 'fetch'],
    // ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
).catch(error => {
    console.error(error);
    process.exit(1);
}).then(() => generateTagName())
    .then(() => {
        console.info('YAY');
        series(
            ['npm', 'publish', '--tag', ticketAndVersion, '--registry', 'https://verdaccio.alcumus.local'],
            ['git', 'tag', '-am', `Release of version ${tagName}`, ticketAndVersion],
            ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after release of version ${tagName}.`],
            ['git', 'push'],
            ['git', 'push', 'origin', ticketAndVersion]
        ).catch(error => {
            console.error(error);
            process.exit(1);
        });
    }).then(() => console.info('Please update hestia-server package.json to use al-hestia version ' + tagName))
    .catch(error => console.error('BOO', error));
