# AI Template Usage Checklist

Use this checklist when creating a project from this repository. Make choices
from the new project's actual needs; this template deliberately does not select
a language, framework, package manager, test runner, or hosting provider.

## 1. Confirm the request

- [ ] Follow the template-use workflow in `AGENTS.md` and record whether this
      repository is being used to create a new project or as reference-only
      inspiration.
- [ ] Confirm the project's purpose, target platforms, selected stack,
      deployment target, dependency policy, and whether an OpenSpec workflow is
      required. Do not invent an unresolved input.

## 2. Establish the project

- [ ] Rename `project-name/` to the project name specified by the user, then
      replace every `{project-name}` placeholder with the confirmed display
      name and project-directory name before adding project-specific
      implementation.
- [ ] Write a concise README introduction from implemented behavior.
- [ ] Remove or replace placeholder images, demo links, commands, packages, and
      release instructions.
- [ ] Keep application work inside the chosen project directory and repository
      metadata at the root, as described in `AGENTS.md`.

## 3. Choose the technical baseline

- [ ] Add only the runtime, package manager, and dependencies required by the
      project.
- [ ] Record actual setup, run, test, build, and formatting commands in the
      README.
- [ ] Update `.gitignore` for generated outputs, local state, and secrets.
- [ ] Add a safe `.env.example` only if the project requires configuration; it
      must contain no real credentials.

## 4. Define quality evidence

- [ ] Add focused automated checks appropriate to the chosen stack.
- [ ] For user-visible work, verify the rendered result in its real runtime or
      browser and capture only current, representative screenshots.
- [ ] Keep temporary test outputs ignored; store the canonical README image in
      the project's documentation directory.
- [ ] Document any manual verification that cannot be automated.

## 5. Configure OpenSpec

- [ ] Replace the neutral `.openspec/config.yaml` context with verified project
      constraints before planning the first substantial change.
- [ ] Keep `changes/` for active work and `specs/` for accepted specifications.
- [ ] Sync accepted delta specifications before archiving a completed change.

## 6. Prepare delivery

- [ ] Add CI and deployment only after their commands and target are known.
- [ ] Document the real release process, including versioning and deployment
      verification, in the README.
- [ ] Confirm that the README demo URL is live before replacing its placeholder.

## 7. Delivery gate

- [ ] Search for `project-name`, `{command}`, `{live-demo-url}`, `{demo_url}`,
      and other template placeholder text; resolve or deliberately remove every
      remaining occurrence.
- [ ] Run every documented local setup, test, build, and formatting command.
      Run deployment or release verification only when authorized; otherwise
      state clearly whether it is intentionally not applicable or awaits user
      authorization.
- [ ] Verify that README links, screenshots, commands, packages, deployment
      instructions, and release instructions describe the resulting project,
      not this template.

## 8. Ask about checklist cleanup

- [ ] After completing this checklist, ask the user explicitly whether they
      would like the AI to clean up this checklist.
