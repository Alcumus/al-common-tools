# Common Rules

This repository contains common automation tools to be shared among multiple projects, including tools for installing linting rules etc.

All changes to this project should be published under a new version number.

To use this project, first install using `npm i --save-dev alcumus-common-tools`, then use the provided binaries to install what you need. For example:

```bash
npx common # install the most common options needed (eslint, tslint, .editorconfig, git hooks, etc.).
npx linting # install eslint and tslint.
npx linting angular # (or npx linting ng) install linters needed for angular projects.
npx linting react # install linters needed for react projects
npx editor-config # install just .editorconfig file.
npx git-hooks # NOT YET IMPLEMENTED: this will install the common git hooks to the project.
```

**_NOTE: These commands will overwrite eachother in case of conflicts. For example npx common will overwrite the results of npx linting angular._**

`npx common` forwards any parameters it receives to all of the other commands it triggers so `npx common angular` will call `npx linting angular`.

These commands should create very minimal files within your current project
(a symlink where appropriate, a simple config file that just extends the ones from this project elsewhere).
In the case of extending config files for linters it also allows us to make project specific changes
if appropriate; though this should be a last resort.

Overall we should make our changes in just this project and use npm to upgrade to newer versions in other projects.

## Using locally

In order to test locally, just clone the repo and link a test project to this as follows:

```bash
npm link # execute in the root of this project to make npm associate this folder with the correct package.
cd <project> # change to your test project.
npm link alcumus-common-tools # equivalent of npm i alcumus-common-tools, but creates symlinks in node_modules instead of installing.
```

## Publishing changes

To publish changes you've made (and tested locally), just run `npm run publish-new`. This will publish to the correct NPM registrar as
well as bumping the version number ready for the next change. For major version changes, first change `package.json` to have the correct
version number, then run `npm run publish-new`.

## Using on Windows

Usage on Windows should be the same as usage on Mac, except that it must be run as an administrator (run your IDE or CMD itself as admin).

## Git hooks

A set of git hooks will be installed in the current project when using `npx common`. They can also be specifically installed
with the `npx install-git-hooks` command. At present these git hooks provide the following functionality:

* Warn when you check out a branch that does not follow the branch naming convention (<ticket>-<description>) or is specifically exempt (master).
* Ensure that all commit messages are prefixed with the ticket number from the branch they were created on. I.e., if you commit with a message
"Fixing unit tests" on branch "HF-99-fixing-framework-bug" your commit message will be automatically changed to "HF-99: Fixing unit tests".

To create more git hooks, simply create a new file with a file name matching any [git hook](https://githooks.com) file
name (with .js after it) in `src/git-hooks` and run the install again. The files will be symlinked to `.git/hooks/`
making sure they will be updated if the npm module is updated.

## Pull-requests

This repository exposes a `npx pr` command that can be used to create pull requests in a standardised way that can be
extended later. At present, this will ensure that the project passes linting before allowing a PR to be created. In the
future this will be extended to include unit tests passing if present etc. In addition to this, a report can be
generated that will be attached to the PR itself. At the moment this just compares linting pre-PR and post-PR, but can
be extended to show changes in code coverage, etc. In addition to this the command allows an easy way of inviting
people by name or by team. In order to create Bitbucket PRs, appropriate credentials must be available in `~/al-tools.credentials.json`.
The `~/al-tools.credentials.json` structure is as follows:

> **Note:**
> 
> In order to execute npx commands that are declared in this project from within this project, add `-p .` to the command
> as in `npx -p . pr ...`

```json
{
    "bitbucket": {
        "username": "<user>_alcumusgroup",
        "password": "--"
    },
    "jira": {
        "username": "<user>",
        "password": "--"
    }
}
```

The JIRA username/password is required to get JIRA descriptions added to your PR, but is otherwise optional. JIRA
unfortunately requires you to put your normal username and password in the config file, while Bitbucket allows you to
create an app password (see [https://confluence.atlassian.com/bitbucket/app-passwords-828781300.html]).

Examples:

```bash
npx pr -r thor # invite Thor to be a reviewer (this will be matched against both full name and username, case insensitive).
npx pr -r pippin mark # invite all of team Pippin and Mark Gabb to be a reviewer.
```

Any number of reviewers can be added and additional groupings can easily be added by changing the `teams.json` file in the S3 bucket `al-automation`.

NOTE: Currently `npx pr` is a short form of `npx pr create`. Additional commands (such as `npx pr update` may be created
in the future).

`npx pr --help` should provide a good idea of the options available, though sensible defaults for merging to `master`
are provided.

### Future improvements

* Add code coverage report to PR.
* Add tasks based on reviewer checklist to PR.
* Stop PR from being created if unit tests fail.
* `npx pr update` - refresh generated content for PR based on changes, but leave other details as they were.

## Making a new command available

 * Add a `<command>-cli.js` file that will handle CLI arguments. Bear in mind that your file may be called
 with arguments that belong to other CLI files so be careful about how you read them.
 * Separate the CLI logic from the business logic, business logic goes in `src`.
 * Add the name of your CLI file to `package.json` under the `bin` property.
 * If appropriate, add it to `common-cli.js`, which is executed for `npx common` as mentioned above.
 * Remember to publish the new version when you're done. (When the NPM repo is ready).
