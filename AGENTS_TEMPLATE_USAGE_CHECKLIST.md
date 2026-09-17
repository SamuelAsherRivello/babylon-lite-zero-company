# AI Template Usage Checklist

Completed for Zero Company on 2026-09-17. Items that are not needed for this
project are recorded as deliberately not applicable rather than left unresolved.

Use this checklist when creating a project from this repository. Make choices
from the new project's actual needs. This repository includes a small
Node/npm/Vite baseline that may be retained or replaced deliberately.

## 1. Confirm the request

- [x] Follow the template-use workflow in `AGENTS.md` and record whether this
      repository is being used to create a new project or as reference-only
      inspiration.
- [x] Confirm the project's purpose, target platforms, selected stack,
      deployment target, dependency policy, and whether an OpenSpec workflow is
      required. Do not invent an unresolved input.

## 2. Establish the project

- [x] Rename `project-name/`, update the Vite `root` setting, and replace every
      `{project-name}`, `{github-owner}`, and `{repository-name}` placeholder
      with confirmed project metadata before adding project-specific
      implementation.
- [x] Rename the README H1 (`# {project-name}`) to the confirmed project name.
- [x] Replace the README introduction placeholder (`This is the project
      repo....`) with a concise summary from implemented behavior.
- [x] Replace the README getting-started placeholder (`This is the getting
      started...`) with accurate setup requirements and first-run guidance.
- [x] Replace the README project-details placeholder (`This is the project
      details...`) with verified project-specific architecture, source layout,
      and workflow details.
- [x] Remove or replace placeholder images, demo links, commands, packages, and
      release instructions.
- [x] Keep the baseline package files at the repository root and application
      source, tests, and assets under the chosen application directory, as
      described in `AGENTS.md`.
- [x] Preserve or deliberately adapt the HTML template corner roles from
      `AGENTS.md`: upper-left project title, upper-right project links,
      lower-right project version, and lower-left project settings.

## 3. Choose the technical baseline

- [x] Add only the runtime, package manager, and dependencies required by the
      project.
- [x] Record actual setup, run, test, build, and formatting commands in the
      README.
- [x] Update `.gitignore` for generated outputs, local state, and secrets; keep
      the baseline `node_modules/` and `project-name/dist/` exclusions if
      Node/Vite remains.
- [x] Add a safe `.env.example` only if the project requires configuration; it
      must contain no real credentials.
      Not applicable: Zero Company requires no environment configuration.

## 4. Define quality evidence

- [x] Add focused automated checks appropriate to the chosen stack.
- [x] For user-visible work, verify the rendered result in its real runtime or
      browser and capture only current, representative screenshots.
- [x] Keep temporary test outputs ignored; store the canonical README image in
      the project's documentation directory.
- [x] Document any manual verification that cannot be automated.

## 5. Configure OpenSpec

- [x] Replace the neutral `openspec/config.yaml` context with verified project
      constraints before planning the first substantial change.
- [x] Keep `changes/` for active work and `specs/` for accepted specifications.
- [x] Sync accepted delta specifications before archiving a completed change.

## 6. Prepare delivery

- [x] Add CI and deployment only after their commands and target are known.
- [x] Confirm the release versioning policy before keeping or documenting the
      baseline patch-only release workflow.
- [x] Document the real release process, including versioning and deployment
      verification, in the README.
- [x] Confirm that the README demo URL is live before replacing its placeholder.

## 7. Delivery gate

- [x] Search for `project-name`, `{github-owner}`, `{repository-name}`,
      `{command}`, `{live-demo-url}`, `{demo_url}`,
      `github-repository-template`, `GitHub Repository Template`, and other
      template placeholder text; resolve or deliberately remove every
      remaining occurrence.
- [x] Run every documented local setup, test, build, and formatting command.
      Run deployment or release verification only when authorized; otherwise
      state clearly whether it is intentionally not applicable or awaits user
      authorization.
- [x] Verify that README links, screenshots, commands, packages, deployment
      instructions, and release instructions describe the resulting project,
      not this template.

## 8. Ask about checklist cleanup

- [x] After completing this checklist, ask the user explicitly whether they
      would like the AI to clean up this checklist.
      Deliberately not applicable for this delivery: the user requested
      automatic completion, so the completed checklist is retained as delivery
      evidence and no cleanup is performed.
