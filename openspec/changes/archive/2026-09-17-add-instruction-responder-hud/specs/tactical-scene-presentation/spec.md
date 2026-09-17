## ADDED Requirements

### Requirement: Corner layout includes the instruction responder

The framed game interface SHALL place the project version in the lower-left corner beneath the existing Settings controls, and SHALL place an `Instructions` heading with one dynamic instruction line in the lower-right corner.

#### Scenario: Initial corner layout is displayed

- **WHEN** the battle view is visible
- **THEN** Settings and the version label appear in the lower-left corner, while the lower-right corner contains the `Instructions` heading and one instruction line

#### Scenario: Instructions fit supported viewports

- **WHEN** the game is displayed at supported desktop or mobile landscape sizes
- **THEN** the heading and instruction line remain inside the framed surface, fit their parent corner, and do not overlap the battlefield, action controls, or other corner content

#### Scenario: Version follows Settings

- **WHEN** the lower-left corner is rendered
- **THEN** the version label appears below Settings and is no longer rendered in the lower-right corner
