# Changelog

## [0.1.2] - 2026-08-17

### Changed

- Upgraded the persona to the merged "high-density technical output" expert prompt: adds explicit priority ordering (accuracy > clarity > conciseness), placeholder/environment/version annotation rules, an uncertainty-handling section (must-state-when-unknown, explicit assumptions), risk-warning and rollback obligations for high-risk operations, and a baseline/override rule that lets the user's explicit in-conversation instructions override default compression. Keeps the same compactness footing (~1.0k tokens vs ~0.7k before).
- Added the author's own copyright line to LICENSE.
- README/README.zh-CN sync the new persona text and the compatibility note (verified on 0.1.0-rc.5 commit 47f9438 and 0.1.0-rc.6; upstream rc.7 not yet verified).

### Added

- Regression assertions for the new persona sections (priority, uncertainty, risk, override rules).

## [0.1.1] - 2026-08-17

### Fixed

- Preserve plan-mode rules by removing `complete: true` from the persona.
- Corrected README/NOTICE claims: `tool-bootstrap` is a first-request tool-surface reduction, not a V4 trajectory anchor.
- NOTICE now states `tool-bootstrap.mjs` is a rewritten implementation inspired by `dsh-anchored-standard`.
- Added regression tests for plan-mode preservation and the absence of `complete: true`.

## [0.1.0] - 2026-08-17

### Added

- Initial release: full Standard tool catalog plus an extreme compact-output expert prompt.
- DSH optimizations: lean runtime context and first-request tool-surface reduction.