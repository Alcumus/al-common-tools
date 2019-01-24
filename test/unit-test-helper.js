const _ = require('lodash');
const util = require('util');

const matchers = sinon => ({
    includes: (...required) => sinon.match(args => required.every(argument => args.includes(argument)), `includes(${required.join(', ')})`)
});

const chaiAssertions = (chai, utils) => {
    const looselyIncludes = (expectedMatch, subject) => {
        const comparator = _.curry((index, actualSubject, difference, expectedValue, key) => {
            if (index && index.split('.').length > 10) {
                return 'Object depth limit exceeded!';
            }
            const newIndex = _.isNull(index) ? key.toString() : `${index}.${key}`;
            const actualValue = _.get(actualSubject, newIndex);
            if (_.isArray(expectedValue) && _.isArray(actualValue)) {
                const allMatch = expectedValue.every((expectedValue) => {
                    return actualValue.some(actualValue => _.isEqual(actualValue, expectedValue));
                });
                if (allMatch === true) {
                    return difference;
                }
            }
            if (_.isObject(expectedValue)) {
                return _.reduce(expectedValue, comparator(newIndex, actualSubject), difference);
            }
            if (!_.isEqual(actualValue, expectedValue)) {
                _.set(difference, newIndex, `expected ${expectedValue}, got ${actualValue}`);
            }
            return difference;
        });

        if (_.isArray(expectedMatch)) {
            const valuesNotLooselyIncludedInArray = expectedValue => {
                return !subject.some(potentialMatch => {
                    const comparison = _.reduce(expectedValue, comparator(null, potentialMatch), {});
                    return Object.keys(comparison).length === 0;
                });
            };

            const missingEntries = _.filter(expectedMatch, valuesNotLooselyIncludedInArray);
            return missingEntries.map(missingEntry => `Could not find value ${util.inspect(missingEntry, { depth: 12 })}`);
        }
        return _.reduce(expectedMatch, comparator(null, subject), {});
    };

    const assertLooselyIncludes = function(expectedMatch) {
        const subject = utils.flag(this, 'object');
        const results = looselyIncludes(expectedMatch, subject);
        if (Object.keys(results).length > 0) {
            const options = { depth: 12 };
            throw new Error(`${util.inspect(subject, options)} does not include ${util.inspect(expectedMatch, options)}. Differences: ${util.inspect(results, { depth: 12 })}`);
        }
    };

    chai.Assertion.addMethod('looselyInclude', assertLooselyIncludes);
    chai.Assertion.addMethod('looselyIncludes', assertLooselyIncludes);
};

const verifyAndCheckResult = _.curry((sinon, resolve, reject, expectedResult, result) => {
    try {
        sinon.verify();
    } catch (error) {
        return reject(error);
    }
    if (expectedResult === result) {
        resolve();
    } else {
        reject();
    }
});

module.exports = sinon => ({
    allowCalls: (mock, method, args, returnValue = undefined) => {
        if (!_.isArray(args)) {
            args = [args];
        }
        mock.expects(method)
            .withArgs(...args)
            .atLeast(0)
            .returns(returnValue);
    },
    matchers: matchers(sinon),
    replaceConstructor: (object) => function() { return object; },
    chaiAssertions,
    verifyAndCheckResult: verifyAndCheckResult(sinon)
});
