module.exports = {
    extends: ['stylelint-config-standard'],
    plugins: [
        'stylelint-scss'
    ],
    rules: {
        indentation: 4,
        'scss/selector-no-redundant-nesting-selector': true,
        'at-rule-no-unknown': null,
        'scss/at-rule-no-unknown': true
    }
};
