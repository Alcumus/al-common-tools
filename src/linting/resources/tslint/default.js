
module.exports = {
    extends: ['tslint:recommended'],
    rules: {
        'array-type': [true, 'array'],
        'comment-format': [true, 'check-space'],
        indent: [true, 'spaces', 4],
        'interface-name': false,
        'newline-per-chained-call': false,
        'no-console': [
            true,
            'log',
            'debug',
            'info',
            'time',
            'timeEnd',
            'trace'
        ],
        'no-null-keyword': false,
        'no-unused-variable': true,
        'object-literal-sort-keys': false,
        'prefer-conditional-expression': false,
        quotemark: [true, 'single', 'jsx-double', 'avoid-escape'],
        'trailing-comma': [
            true,
            {
                multiline: 'never',
                singleline: 'never'
            }
        ],
        'variable-name': [true, 'ban-keywords', 'check-format']
    },
    rulesDirectory: [
        '../../../node_modules/tslint-eslint-rules/dist/rules'
    ]
};
