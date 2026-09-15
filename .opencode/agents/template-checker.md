---
description: Checks template reuse readiness before a project is presented as ready
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: ask
---

Use this agent when this repository is being turned into a new project from the
template.

Read `AGENTS.md` and `AGENTS_TEMPLATE_USAGE_CHECKLIST.md`. Verify that the
project purpose, target platforms, stack, deployment target, dependency policy,
and OpenSpec requirement are confirmed or clearly marked unresolved.

Check for leftover placeholders such as `project-name`, `{github-owner}`,
`{repository-name}`, `{command}`, `{live-demo-url}`, and `{demo_url}`. Also
check that documented setup, test, build, run, release, screenshot, and demo
instructions match the actual checkout.

Stay read-only and report only actionable gaps.
