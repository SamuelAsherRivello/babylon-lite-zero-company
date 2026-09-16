<!-- AI: Keep commands rooted at the repository. The Vite application, source, tests, and build output belong in zero-company/. -->
![Samuel Asher Rivello](zero-company/documentation/samuel-asher-rivello-banner.png)

# Zero Company

Zero Company is a compact Babylon.js tactical game for desktop and mobile
browsers. The current camera milestone opens directly on a lit 3D greybox
battlefield with three blue operatives, three red enemies, three cover blocks,
unit inspection, static tactical feedback, and focus-based camera controls.
Move, Shoot, Overwatch, and End Turn are deliberately presentation-only until
the gameplay milestone is applied.

Current version: `v0.0.3`

## Images

### Screenshot

<a href="zero-company/documentation/screenshot01.png"><img src="zero-company/documentation/screenshot01.png" width="640" alt="Zero Company greybox tactical battlefield" /></a>

## Live Demo

- [samuelasherrivello.github.io/babylon-lite-zero-company](https://samuelasherrivello.github.io/babylon-lite-zero-company/)

The local Vite build is the authoritative preview until this milestone is
pushed and the GitHub Pages deployment completes.

## Getting Started

Use the repository root for dependency, test, build, and run commands. The Vite
application lives in `zero-company/`.

### Install And Run

1. Run `npm install`.
2. Run `npm run dev`.
3. Open the local URL printed by Vite.

### Verify

- `npm test` runs focused source, inventory, lifecycle, responsive-layout, and
  local-GLB checks.
- `npm run build` creates the GitHub Pages build in `zero-company/dist/`.
- With Vite running at the default verified URL, `npm run test:browser` checks
  desktop and mobile camera behavior, WebGL pixels, local-only requests,
  failure handling, and the clean browser console. Set `ZERO_COMPANY_URL` when
  Vite uses a different port.

## Controls

- Select any operative or enemy with the primary mouse button or one-finger
  tap to focus the camera and inspect its presentation data.
- Hold the secondary mouse button and drag to orbit around the selected focus.
- Use the mouse wheel to zoom within the tactical camera limits.
- On a landscape touch device, drag with two fingers to orbit and pinch to zoom.
- Portrait mobile displays a rotate-device blocker and preserves camera state.

## Project Details

React owns the HTML interface in `ui_layer`, including the four template corner
roles, action bar, inspection panel, projected unit HUDs, loading/error states,
and orientation blocker. Babylon.js owns the canvas and scene in
`content_layer`. Both layers share a centered 16:9 frame with dark
letterboxing or pillarboxing.

The scene uses one original, locally bundled CC0 character GLB for all six
operatives. Team materials distinguish blue and red units. Models, materials,
icons, and presentation feedback require no runtime internet connection.
Detailed provenance is recorded in
[zero-company/documentation/assets.md](zero-company/documentation/assets.md).

### Structure

- `zero-company/src/game/` contains scene descriptors, construction, lifecycle,
  projected HUD coordinates, picking, and camera input.
- `zero-company/src/App.jsx` contains the React presentation interface.
- `zero-company/test/` contains focused Node and real-browser smoke checks.
- `zero-company/public/assets/` contains runtime-local game assets.
- `zero-company/documentation/` contains research, provenance, and the canonical
  screenshot.
- `openspec/` contains active and accepted project specifications.

### Packages

- [Babylon.js](https://www.babylonjs.com/) renders the 3D scene.
- [React](https://react.dev/) renders the accessible HTML interface.
- [Lucide](https://lucide.dev/) provides interface icons.
- [Vite](https://vite.dev/) provides local development and production builds.

## Release Version

1. Run `npm test`, `npm run build`, and the documented browser verification.
2. Push to `main` to deploy through the GitHub Pages workflow.
3. Run the **Release** workflow from GitHub Actions to bump the patch version,
   tag it, and create the GitHub release.

## Credits

### Contributors

- Samuel Asher Rivello - Over 25 years of game development XP (2026)

### Contact

- [LinkedIn.com/in/SamuelAsherRivello](https://Linkedin.com/in/SamuelAsherRivello)
- [GitHub.com/SamuelAsherRivello](https://github.com/SamuelAsherRivello/)
- [Twitter.com/srivello](https://twitter.com/srivello/)
- Resume / Portfolio: [SamuelAsherRivello.com](http://www.SamuelAsherRivello.com)

### License

- Provided as-is under the [MIT License](LICENSE).
- Copyright (c) 2026 Rivello Multimedia Consulting, LLC.
