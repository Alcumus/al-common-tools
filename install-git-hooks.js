#!/usr/bin/env node
const fs = require('fs');
const promisify = require('util').promisify;
const mkdirp = promisify(require('mkdirp'));
const rollup = require('rollup');
const rimraf = promisify(require('rimraf'));
const resolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');
const executable = require('rollup-plugin-executable');
const path = require('path');

fs.readdir = promisify(fs.readdir);
fs.unlink = promisify(fs.unlink);
fs.symlink = promisify(fs.symlink);
fs.rename = promisify(fs.rename);

const directories = {
    build: path.join(__dirname, './build/'),
    hooksBuild: path.join(__dirname, './build/hooks'),
    hooksSource: path.join(__dirname, './src/git-hooks/'),
    hooksTarget: path.join(process.cwd(), './.git/hooks')
};

const buildBundle = async (directories, hook) => {
    return await rollup.rollup({
        input: path.join(directories.hooksSource, hook),
        external: [],
        plugins: [
            resolve(),
            commonJs(),
            executable()
        ]
    });
};

const writeBundleToFile = async (directories, hook, bundle) => {
    const hookFileName = hook.replace(/\.js$/i, '');
    const hookOutputFile = path.join(directories.hooksBuild, hookFileName);
    await bundle.write({
        file: hookOutputFile,
        format: 'cjs',
        output: {
            banner: '#!/usr/bin/env node'
        }
    });
    return [hookFileName, hookOutputFile];
};

const createSymlinkToBundle = async (directories, hookFileName, hookOutputFile) => {
    const tempLocation = path.join(directories.hooksTarget, `temp-symlink-file-${hookFileName}`);
    await fs.symlink(hookOutputFile, tempLocation);
    await fs.rename(tempLocation, path.join(directories.hooksTarget, hookFileName));
};

const installHooks = async (directories) => {
    await rimraf(directories.build);
    await mkdirp(directories.hooksBuild);
    await mkdirp(directories.hooksTarget);
    const hooks = await fs.readdir(directories.hooksSource);
    return Promise.all(hooks.map(async (hook) => {
        const bundle = await buildBundle(directories, hook);
        const [hookFileName, hookOutputFile] = await writeBundleToFile(directories, hook, bundle);
        await createSymlinkToBundle(directories, hookFileName, hookOutputFile);
    }));
};

installHooks(directories)
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
