<!-- AI: Keep commands rooted at the repository. The Vite application, source, tests, and build output belong in phaser4-platformer/. -->
![Samuel Asher Rivello](documentation/samuel-asher-rivello-banner.png)

# Phaser 4 Platformer

This small Phaser 4 browser demo keeps its surrounding interface in HTML while the game layer renders a movable square and its clickable controls.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Controls](#controls)
3. [Project Details](#project-details)
4. [Credits](#credits)

## Getting Started

<!-- AI: Update these baseline Node/npm/Vite commands if the selected stack changes. -->
The project requires Node.js 24 and npm.

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

## Controls

- Move the blue square with WASD or the arrow keys.
- Use the canvas controller along the bottom edge for movement on touch devices.
- Trigger Action 1 with C or its clickable `Action 1 (c)` game-layer button.
- Trigger Action 2 with V or its clickable `Action 2 (v)` game-layer button.

## Project Details

- `phaser4-platformer/src/main.js` contains the Phaser scene, square movement, action feedback, and game-layer controls.
- `phaser4-platformer/index.html` provides the separate HTML UI layer and starts the Phaser module.
- [Phaser 4](https://phaser.io/download/phaser4) supplies the browser game engine.
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
