/* globals describe, it, beforeEach, afterEach, context */
const _ = require('lodash');
const assert = require('assert');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('Checklists index', () => {
    let checklistFiles;
    let checklists;

    beforeEach(() => {
        checklistFiles = _.times(10, n => ({ name: `checklist-test-${n}`, getTasks: () => {} }));

        const addFileExports = (accumulator, file) => ({ ...accumulator, [`./${file.name}.js`]: file });
        const fileExports = checklistFiles.reduce(addFileExports, {});
        checklists = proxyquire('../../../src/pull-request/checklists/index', fileExports);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#init', () => {
        it('should return a promise that resolves to a function', () => {
            return checklists.init()
                .then(result => assert(_.isFunction(result), `Expected a function. Got ${result}`));
        });

        context('get checklists function', () => {
            let getChecklists;

            const initialiseWithFiles = files => {
                sinon.stub(fs, 'readdir').returns(Promise.resolve(files.map(file => `${file.name}.js`)));
                return checklists.init()
                    .then(result => getChecklists = result);
            };

            context('with no files in checklists folder', () => {
                beforeEach(() => initialiseWithFiles([]));

                it('should return an empty object', () => {
                    assert.deepStrictEqual(getChecklists(), {});
                });
            });

            context('with one file in checklists folder', () => {
                let checklist;

                beforeEach(() => {
                    checklist = checklistFiles[1];
                    return initialiseWithFiles([checklist]);
                });

                it('should return an object with a mapping from the checklist name to the returned tasks', () => {
                    const tasks = ['1', '2', '3'];
                    sinon.stub(checklist, 'getTasks').returns(tasks);

                    assert.deepStrictEqual(getChecklists(), {
                        [checklist.name]: tasks
                    });
                });
            });

            context('with several files in checklists folder', () => {
                beforeEach(() => initialiseWithFiles(checklistFiles));

                it('should return an object with a mapping from the checklist name to the returned tasks', () => {
                    const tasks = _.times(checklistFiles.length, n => ([n, n + 1]));
                    const expectedMapping = {};
                    for (const [index, file] of checklistFiles.entries()) {
                        const fileTasks = tasks[index];
                        expectedMapping[file.name] = fileTasks;
                        sinon.stub(file, 'getTasks').returns(fileTasks);
                    }

                    assert.deepStrictEqual(getChecklists(), expectedMapping);
                });

                it('should filter out checklists with no tasks', () => {
                    const tasks = ['1', '2', '3'];
                    const expectedMapping = {
                        [checklistFiles[2].name]: tasks
                    };
                    for (const [index, file] of checklistFiles.entries()) {
                        if (index !== 2) {
                            sinon.stub(file, 'getTasks').returns([]);
                        } else {
                            sinon.stub(file, 'getTasks').returns(tasks);
                        }
                    }

                    assert.deepStrictEqual(getChecklists(), expectedMapping);
                });

                it('should consider undefined to mean no tasks', () => {
                    const tasks = ['1', '2', '3'];
                    const expectedMapping = {
                        [checklistFiles[2].name]: tasks
                    };
                    for (const [index, file] of checklistFiles.entries()) {
                        if (index !== 2) {
                            sinon.stub(file, 'getTasks').returns(undefined);
                        } else {
                            sinon.stub(file, 'getTasks').returns(tasks);
                        }
                    }

                    assert.deepStrictEqual(getChecklists(), expectedMapping);
                });

                it('should call isActive on any checklist that has it with all parameters passed in to it', () => {
                    const expectedParameters = { a: 1, b: 2, c: 3 };
                    [1, 3, 5].map(n => checklistFiles[n])
                        .forEach(checklist => {
                            checklist.isActive = () => {};
                            sinon.mock(checklist).expects('isActive')
                                .once()
                                .withExactArgs(expectedParameters);
                        });

                    getChecklists(expectedParameters);
                    sinon.verify();
                });

                it('should filter out checklists whose isActive function returns false', () => {
                    const expectedChecklists = [1, 2, 5].map(n => checklistFiles[n]);
                    checklistFiles.forEach(checklist => {
                        checklist.isActive = () => expectedChecklists.includes(checklist);
                        checklist.getTasks = () => [true];
                    });

                    assert.deepStrictEqual(getChecklists(), {
                        [expectedChecklists[0].name]: [true],
                        [expectedChecklists[1].name]: [true],
                        [expectedChecklists[2].name]: [true]
                    });
                });
            });
        });
    });
});
