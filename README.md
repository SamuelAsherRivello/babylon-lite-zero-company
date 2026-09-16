<!-- AI: Keep commands rooted at the repository. The Vite application, source, tests, and build output belong in zero-company/. -->
![Samuel Asher Rivello](zero-company/documentation/samuel-asher-rivello-banner.png)

# Zero Company

Zero Company is a Babylon-ready Vite/React project shell for the `babylon-lite-zero-company` repository. It preserves the template's safe-area browser layout with a project title, repository link, fullscreen setting, and visible release version.

Current version: `v0.0.3`

## Images

### Screenshots

<a href="zero-company/documentation/screenshot01.png"><img src="zero-company/documentation/screenshot01.png" width="400" alt="Zero Company screenshot" /></a>

## Live Demo

- [samuelasherrivello.github.io/babylon-lite-zero-company](https://samuelasherrivello.github.io/babylon-lite-zero-company/)

## Table of Contents

1. [Images](#images)
2. [Live Demo](#live-demo)
3. [Getting Started](#getting-started)
4. [Project Details](#project-details)
5. [Credits](#credits)

## Getting Started

Use the repository root for dependency, test, build, and release commands. The Vite application lives in `zero-company/`.

### 🛠 Build Project

1. From the repository root, run `npm install`.
2. Run `npm run build`.

### 🛠 Run Project

1. From the repository root, run `npm run dev` and open the localhost URL Vite prints.
2. Run `npm test` to execute the focused source checks.

### 🛠 Release Version

1. Run `npm test` and `npm run build` from the repository root.
2. Push to `main` to deploy through the GitHub Pages workflow.
3. Run the **Release** workflow from GitHub Actions to bump the patch version, tag it, and create the GitHub release.

## Project Details

Zero Company currently uses a minimal Vite, React, and plain CSS baseline. The root package owns npm scripts and dependency lockfiles, while application source, tests, build output, and documentation assets stay under `zero-company/`.

### 📝 Structure

- `zero-company/index.html` provides the plain safe-area HTML shell.
- `zero-company/test/` contains focused automated checks for the app shell.
- `zero-company/documentation/` contains canonical README images and project
  documentation assets.

### 📦 AI

- `AGENTS.md` contains repository-specific AI agent guidance.
- `AGENTS_TEMPLATE_USAGE_CHECKLIST.md` contains the template reuse checklist.
- [OpenCode](.opencode/) contains additional agent guidance.
- [openspec](openspec/) contains the repository's specification workflow
  configuration.

### 📦 Packages

- [Vite](https://vite.dev/) provides local development and production builds.


## Credits

<!-- AI: Preserve established attribution and ownership. Customize the following subsections only from confirmed contributor, contact, and license information; do not infer a new owner from the repository name. -->
### 💡 Contributors

<!-- AI: Preserve existing contributor credit and add contributors only when confirmed. Do not automatically advance experience counts or their reference year. -->
- Samuel Asher Rivello - Over 25 years of game development XP (2026)

### 💡 Contact

<!-- AI: Preserve confirmed contact destinations and their order unless requested otherwise. Use readable display URLs without a protocol or trailing slash while keeping the real link target intact. Do not invent accounts or change target capitalization based on display styling. -->
- [LinkedIn.com/in/SamuelAsherRivello](https://Linkedin.com/in/SamuelAsherRivello) ⭐ 
- [GitHub.com/SamuelAsherRivello](https://github.com/SamuelAsherRivello/)
- [Twitter.com/srivello](https://twitter.com/srivello/)
- Resume / Portfolio: [SamuelAsherRivello.com](http://www.SamuelAsherRivello.com)


### 💡 License

<!-- AI: Keep the license name linked to the actual relative license file and verify that its terms match this statement. Keep the copyright holder and year consistent with that file. Do not change license terms, ownership, or dates without an explicit request. -->
- Provided as-is under the [MIT License](LICENSE).

- Copyright © 2026 Rivello Multimedia Consulting, LLC.
