const promisify = require('util').promisify;
const path = require('path');
const fs = require('fs');
fs.readdir = promisify(fs.readdir);

module.exports = {
    dependencies: {
        react: {
            'eslint-plugin-react': 'latest',
            'eslint-plugin-react-hooks': 'latest'
        }
    },
    linters: [{
        name: 'eslint',
        configFile: '.eslintrc.json',
        fileMatcher: '"src/**/*.js" "test/**/*.js" "*.js"'
    }, {
        name: 'tslint',
        configFile: 'tslint.json',
        fileMatcher: '--project ./tsconfig.json "src/**/*.ts" "*.ts"'
    }, {
        name: 'stylelint',
        configFile: '.stylelintrc.json',
        fileMatcher: '"src/**/*.scss" "*.scss"'
    }],
    getRules: (linter) => {
        linter = linter.name || linter;
        const linterDirectory = `${__dirname}/${linter}`;
        const relativePath = path.relative(process.cwd(), linterDirectory);
        return fs.readdir(linterDirectory)
            .then(files => files
                .filter(file => file.match(/\.js$/))
                .map(file => ({
                    path: `./${relativePath}/${file}`,
                    name: file.replace(/\.js/, '')
                }))
            );
    }
};
