# AI Repository Guidance

## Template use workflow

If user directs you to use this template, then follow these steps:

1. Determine the reuse mode from the request. For a new GitHub repository,
   use GitHub's **Use this template** flow when authorized. For a local project,
   create an authorized copy in its explicitly named destination. When the user
   says to use this repository only as inspiration, inspect it as a reference
   and copy no files unless they request that.
2. Read this file, then read
   `AGENTS_TEMPLATE_USAGE_CHECKLIST.md` before adding a stack or changing
   project files.
3. Confirm the project's purpose, target platforms, selected stack, deployment
   target, dependency policy, and whether an OpenSpec workflow is required. Ask
   only for an input that is material and not provided or discoverable.
4. Rename `project-name/` and replace the `project-name` placeholders before
   adding project-specific implementation. Keep repository metadata at the
   repository root.
5. Inspect the resulting project's actual configuration before documenting or
   running setup, test, build, deployment, or release commands. Complete the
   checklist's delivery gate before presenting the project as ready.

## Working directories

- **Repository root** is the directory containing `.git`, `README.md`, and repository metadata. Run Git commands there, including status, diff, commit, branch, and history commands. Work on repo-level files there only when the task concerns them, such as `README.md`, `LICENSE`, `.github/`, `.agents/`, or `.openspec/`.
- **Project root** is `project-name/`. Default to this directory for project work: source, assets, project configuration, dependencies, package/build/test/run commands, and project documentation.
- Do not place project files at the repository root or run project commands there unless the task explicitly concerns a repo-level file or tool.

Correct: run `git status` from the repository root, then run a verified
project command from `project-name/`.

Incorrect: run a project command from the repository root, or treat the
repository root as the project root merely because it contains `.git`.
