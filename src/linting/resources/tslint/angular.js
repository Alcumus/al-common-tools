
module.exports = {
    extends: ['angular-tslint-rules', './default.js'],
    rules: {
        'angular-whitespace': [true, 'check-interpolation', 'check-pipe'],
        'component-selector': false,
        'directive-selector': false,
        i18n: false,
        'no-template-call-expression': false,
        "trackBy-function": false
    },
    rulesDirectory: [
        '../../../node_modules/codelyzer'
    ]
};
