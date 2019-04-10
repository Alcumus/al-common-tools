module.exports = {
    extends: [
        './browser.js',
        'plugin:react/recommended'
    ],
    env: {
        jest: true
    },
    rules: {
        'react-hooks/rules-of-hooks': 'error',
        'jsx-quotes': ['error', 'prefer-double']
    },
    plugins: [
        'react-hooks'
    ],
    parserOptions: {
        sourceType: 'module'
    },
    settings: {
        react: {
            version: 'latest'
        }
    }
};
