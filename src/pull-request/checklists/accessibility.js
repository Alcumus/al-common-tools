const _ = require('lodash');

const isActive = ({ jsxChanged, args = {} }) => {
    if (_.isBoolean(args.jsx)) {
        return args.jsx;
    }
    return jsxChanged === true;
};

const getTasks = () => ['Check images have alt tags'];

module.exports = {
    name: 'Accessibility',
    isActive,
    getTasks
};
