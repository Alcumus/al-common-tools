#!/usr/bin/env node

const { runShellVerbose } = require('./run.js');

const versionArguments = process.argv.slice(2);
if (!(versionArguments[0] || '').match(/^([0-9\\.]+|major|minor|patch|premajor|preminor|prepatch|prerelease|from-git)$/)) {
    versionArguments.unshift('patch');
}

const series = async (...commands) => {
    for (const command of commands) {
        await runShellVerbose(...command);
    }
};

const version = require(`${process.cwd()}/package.json`).version;
const tagName = `release/v${version}`;

series(
    ['git', 'update-index', '--refresh'],
    ['git', 'fetch'],
    ['git', 'diff-index', '--quiet', 'HEAD', '--'], // Ensure there are no local changes.
    ['npm', 'publish'],
    ['git', 'tag', '-am', `Release of version ${version}`, tagName],
    ['npm', '--no-git-tag-version', 'version', ...versionArguments],
    ['git', 'commit', '-am', `[AUTOMATED] Updating version numbers after release of version ${version}.`],
    ['git', 'push'],
    ['git', 'push', 'origin', tagName]
).catch(error => {
    console.error(error);
    process.exit(1);
});
