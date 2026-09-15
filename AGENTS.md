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
4. Keep `phaser4-platformer/` as the Vite application root and keep the GitHub
   repository URL synchronized with the project repository. The repository root
   remains the npm project root.
5. Inspect the resulting project's actual configuration before documenting or
   running setup, test, build, deployment, or release commands. Complete the
   checklist's delivery gate before presenting the project as ready.

## Working directories

- **Repository root** is the npm project root. It contains `.git`, repository
  metadata, and package configuration. Project documentation assets live in
  `project-name/documentation/`. Run Git,
  dependency, build, test, and run commands there.
- **Application root** is `phaser4-platformer/`. It contains the Vite entry page,
  source, tests, assets, and build output. Keep application implementation
  there unless the selected stack deliberately changes the layout.

Correct: run `git status`, dependency, build, test, and run commands from the
repository root; keep the application's source and tests under
`phaser4-platformer/`.
