## 1. Terrain Rule Foundation

- [x] 1.1 Add cover-adjacency and flank-detection helpers derived from level geometry and verify focused tests cover defended, flanked, blocked-LOS, and no-cover cases
- [x] 1.2 Extend shared attack previews with base hit probability, final hit probability, terrain modifier metadata, the 20 percentage-point cover reduction, and the 5% legal-shot clamp; verify preview and resolution use the same final probability

## 2. Combat Integration

- [x] 2.1 Apply cover-adjusted previews to Shoot targeting and resolution and verify combat/shoot tests cover selectable covered targets and blocked LOS remains unselectable
- [x] 2.2 Apply cover-adjusted previews to Overwatch reaction attacks and verify reaction tests cover covered cone entry, blocked cone entry, and shot allowance consumption
- [x] 2.3 Update enemy expected-damage scoring to use cover-adjusted previews and verify enemy AI tests cover choosing a flank when it improves utility

## 3. Presentation

- [x] 3.1 Show cover-defense modifier text in player attack previews and verify page/unit tests cover the displayed reduced probability and modifier label
- [x] 3.2 Add a programmatic lower in-cover character pose for actively defended units and verify presentation tests cover pose activation, pose clearing, and unchanged gameplay cell/selection state
- [x] 3.3 Add browser smoke coverage for covered-shot preview readability and the in-cover pose on desktop and mobile landscape, verifying no overlap with HUD or confirmation controls

## 4. Regression Verification

- [x] 4.1 Run `npm.cmd test` from the repository root and verify all rules, page, presentation, and browser-support tests pass
- [x] 4.2 Run `npm.cmd run build` from the repository root and verify the production build succeeds
- [x] 4.3 Run `openspec validate --specs --strict` and verify all specs validate
