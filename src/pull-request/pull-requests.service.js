const Bitbucket = require('bitbucket');
const _ = require('lodash');
const fs = require('fs');
const promisify = require('util').promisify;
const request = require('request-promise-native');

fs.readFile = promisify(fs.readFile);
fs.writeFile = promisify(fs.writeFile);

let teamsCache;

const getTeams = async (config) => {
    if (teamsCache) {
        return teamsCache;
    }
    teamsCache = await request(config.teamsUrl || 'https://s3.eu-west-2.amazonaws.com/al-automation/teams.json');
    teamsCache.all = Object.values(teamsCache).reduce(_.ary(_.union, 2), []);
    return teamsCache;
};

const authenticate = (authentication) => {
    if (_.isEmpty(authentication.type)) {
        authentication.type = 'basic';
    }
    const bitbucket = new Bitbucket();
    bitbucket.authenticate(authentication);
    const extractValues = result => _.get(result, 'data.values');

    const filterUser = _.curry((matches, user) => {
        const displayName = user.displayName.toLowerCase();
        const userName = user.username.toLowerCase();

        return matches
            .filter(match => !/^\d+$/.test(match.toString()))
            .map(match => match.toLowerCase())
            .some(match => displayName.includes(match) || userName.includes(match));
    });

    const replaceTeamsWithUsers = (teams, users) => {
        users = _.uniq(users);
        _.forEach(teams, (teamMembers, team) => {
            const index = users.findIndex(user => user === team);
            if (index >= 0) {
                users.splice(index, 1, ...teamMembers.map(teamMember => teamMember.username));
            }
        });
        return users;
    };

    function* randomArrayGenerator(array, maximum) {
        for (let iteration = 0; array.length > 0 && iteration < maximum; iteration++) {
            const index = _.random(array.length - 1);
            yield _.pullAt(array, index)[0];
        }
    }

    const getUsers = async (config, matches, exclude) => {
        const teams = await getTeams(config);
        const filterExcludedUsers = user => exclude ? user.username !== exclude : true;
        const requiredUsers = teams.all
            .filter(filterUser(replaceTeamsWithUsers(teams, matches)))
            .filter(filterExcludedUsers);
        const numberOfRandomUsers = matches.reduce((sum, value) => sum + _.toInteger(value), 0);
        const unselectedUsers = _.difference(teams.all, requiredUsers)
            .filter(filterExcludedUsers);
        const randomUsers = [...randomArrayGenerator(unselectedUsers, numberOfRandomUsers)];
        return requiredUsers.concat(randomUsers);
    };

    const getUserIds = async (config, users, exclude) => (await getUsers(config, users, exclude)).map(user => user.uuid);

    const createPullRequest = ({ owner, title, repositorySlug, sourceBranch, destinationBranch, reviewers, description, dryRun = false }) => {
        reviewers = reviewers.map(reviewer => typeof reviewer === 'string' ? { uuid: reviewer } : reviewer);
        const body = {
            title,
            reviewers,
            description
        };
        _.set(body, 'source.branch.name', sourceBranch);
        _.set(body, 'destination.branch.name', destinationBranch);
        const pullRequest = { repo_slug: repositorySlug, username: owner, _body: body };
        if (dryRun) {
            pullRequest.data = _.merge({}, pullRequest.data, {
                id: ':fake-id:',
                uuid: ':fake-uuid:',
                source: {
                    repository: {
                        full_name: ':fake-repository-name:',
                        uuid: ':fake-repository-uuid:'
                    }
                }
            });
            return [pullRequest];
        }
        return bitbucket.pullrequests.create(pullRequest)
            .then(result => [pullRequest, result]);
    };

    const getRepositories = (owner, query) => {
        return bitbucket.repositories.list({ username: owner, q: query })
            .then(extractValues);
    };

    const getRepositorySlug = (owner, projectName) => {
        const query = `(name = "${projectName}")`;
        return getRepositories(owner, query)
            .then(repositories => _.get(repositories, '0.slug'));
    };

    const getBranchCommits = ({ owner, repositorySlug, sourceBranch, destinationBranch }) => {
        return bitbucket.commits.list({
            username: owner,
            repo_slug: repositorySlug,
            include: sourceBranch,
            exclude: destinationBranch
        }).then(extractValues);
    };

    const getBranchCommitMessages = ({ owner, repositorySlug, sourceBranch, destinationBranch }) => {
        return getBranchCommits({ owner, repositorySlug, sourceBranch, destinationBranch })
            .then(commits => commits.map(commit => commit.message));
    };

    const createComment = ({ pullRequest, message, dryRun = false }) => {
        const comment = {
            pull_request_id: _.get(pullRequest, 'data.id', pullRequest),
            username: _.get(pullRequest, 'data.source.repository.full_name', '').replace(/\/.*/, ''),
            repo_slug: _.get(pullRequest, 'data.source.repository.uuid'),
            _body: {
                content: {
                    raw: message
                }
            }
        };
        if (dryRun) {
            return comment;
        }
        return bitbucket.pullrequests.createComment(comment);
    };

    return {
        getUsers,
        getUserIds,
        createPullRequest,
        createComment,
        getRepositories,
        getRepositorySlug,
        getBranchCommits,
        getBranchCommitMessages
    };
};

module.exports = {
    authenticate
};

