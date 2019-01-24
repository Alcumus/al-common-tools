const _ = require('lodash');
const fs = require('fs');
const promisify = require('util').promisify;

fs.readdir = promisify(fs.readdir);

const filterNonJsFilesAndIndex = files => files.filter(file => file !== 'index.js' && file.match(/\.js$/));
const loadChecklists = files => files.map(file => require(`./${file}`));
const initChecklist = checklist => {
    if (_.isFunction(checklist.init)) {
        return checklist.init().then(() => checklist);
    } else {
        return Promise.resolve(checklist);
    }
};
const initChecklists = checklists => Promise.all(checklists.map(initChecklist));

const wrapChecklists = checklists => ({ ...parameters } = {}) => {
    return checklists
        .filter(checklist => _.isFunction(checklist.isActive) ? checklist.isActive(parameters) : true)
        .map(checklist => ({ name: checklist.name, tasks: checklist.getTasks(parameters) }))
        .reduce((accumulator, checklist) => {
            if (_.isEmpty(checklist.tasks)) {
                return accumulator;
            }
            return Object.assign(accumulator, { [checklist.name]: checklist.tasks });
        }, {});
};

const init = () => {
    return fs
        .readdir(__dirname)
        .then(filterNonJsFilesAndIndex)
        .then(loadChecklists)
        .then(initChecklists)
        .then(wrapChecklists);
};
module.exports = {
    init
};
