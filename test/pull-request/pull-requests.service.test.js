/* globals describe, context, beforeEach, afterEach, it */

const _ = require('lodash');
const Bitbucket = require('bitbucket');
const chai = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const unitTestHelper = require('../unit-test-helper.js')(sinon);
chai.use(unitTestHelper.chaiAssertions);
const expect = chai.expect;

describe('Pull requests service', () => {
    let pullRequestService;
    let bitbucket;
    let stubRequest = sinon.stub();

    beforeEach(() => {
        bitbucket = new Bitbucket();
        pullRequestService = proxyquire('../../src/pull-request/pull-requests.service.js', {
            bitbucket: unitTestHelper.replaceConstructor(bitbucket),
            lodash: _,
            'request-promise-native': stubRequest
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    context('user access functions', () => {
        const teams = require('../teams.json');

        beforeEach(() => {
            sinon.stub(bitbucket, 'authenticate');
            stubRequest.returns(Promise.resolve(teams));
            pullRequestService = pullRequestService.authenticate({});
        });

        const compareMatch = _.curry(async(matchStrings, expectedResults, testUserId, exclude = null) => {
            const functionName = testUserId ? 'getUserIds' : 'getUsers';
            let results = await pullRequestService[functionName]({}, matchStrings, exclude);
            if (testUserId) {
                expectedResults = expectedResults.map(result => result.uuid);
            } else {
                expectedResults = expectedResults.map(result => ({ displayName: result.displayName }));
            }
            expect(results).to.be.an('array').that.deep.looselyIncludes(expectedResults);
        });

        const tests = [{
            it: 'should allow partial matches of provided users',
            test: compareMatch(['user6', 'user12'], [teams.team2[0], teams.team3[1]])
        }, {
            it: 'should translate a team name in to an array of all users on that team',
            test: compareMatch(['team2'], teams.team2)
        }, {
            it: 'should correctly combine individuals and teams',
            test: compareMatch(['user6', 'team3'], teams.team3.concat(teams.team2[0]))
        }, {
            it: 'should pick N random individuals when provided with an integer',
            test: testUserId => {
                sinon.stub(_, 'random')
                    .onCall(0).returns(6)
                    .onCall(1).returns(4)
                    .onCall(2).returns(0);
                compareMatch([3], [teams.all[6], teams.all[4], teams.all[0]], testUserId);
            }
        }, {
            it: 'should correctly combine individuals, teams, and random selection',
            test: testUserId => {
                sinon.stub(_, 'random')
                    .onCall(0).returns(5)
                    .onCall(1).returns(3)
                    .onCall(2).returns(1);
                compareMatch(['team3', 'user6', 3], teams.team3.concat(teams.team2[0], teams.all[5], teams.all[3], teams.all[1]), testUserId);
            }
        }, {
            it: 'should not include excluded user in random results',
            test: testUserId => {
                sinon.stub(_, 'random')
                    .onCall(0).returns(0);
                compareMatch([1], [teams.team1[1]], testUserId, teams.team1[0].username);
            }
        }];

        describe('#getUsers', () => {
            tests.forEach(metadata => it(metadata.it, _.partial(metadata.test, false)));
        });

        describe('#getUserIds', () => {
            tests.forEach(metadata => it(metadata.it, _.partial(metadata.test, true)));
        });
    });
});
