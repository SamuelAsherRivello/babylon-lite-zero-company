# AI Repository Guidance

## Working directories

- **Repository root** is the directory containing `.git`, `README.md`, and repository metadata. Run Git commands there, including status, diff, commit, branch, and history commands. Work on repo-level files there only when the task concerns them, such as `README.md`, `LICENSE`, `.github/`, `.agents/`, or `.openspec/`.
- **Project root** is `project-name/`. Default to this directory for project work: source, assets, project configuration, dependencies, package/build/test/run commands, and project documentation.
- Do not place project files at the repository root or run project commands there unless the task explicitly concerns a repo-level file or tool.

Correct: run `git status` from the repository root, then run a verified
project command from `project-name/`.

Incorrect: run a project command from the repository root, or treat the
repository root as the project root merely because it contains `.git`.
