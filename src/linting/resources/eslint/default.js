
module.exports = {
    extends: ['eslint:recommended'],
    env: {
        es6: true,
        node: true
    },
    rules: {
        'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
        indent: ['error', 4],
        quotes: ['error', 'single', { avoidEscape: true }],
        semi: ['error', 'always'],
        'no-unused-vars': ['error', { argsIgnorePattern: '^__', varsIgnorePattern: '^__' }]
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2018
    }
};
