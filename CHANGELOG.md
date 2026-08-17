# Changelog

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