# Changelog

## [0.2.0] - 2026-08-17

Measured-motivated revision. A runtime audit of local session logs (same
host, same DSH 0.1.0-rc.6, same model deepseek-v4-flash) showed the previous
release's two "optimizations" had no measurable unique benefit and its system
cost was a net increase:

- System prompt grew from the host default's 46 chars to 7,022 chars
  (identity + instructions + persona); context caching amortizes the recurring
  cost, but the first request pays the full delta.
- The bundled `tool-bootstrap` duplicated the host default's anchored
  bootstrap: first-request tool count was 2 (shell + read) with and without
  this preset — zero marginal gain for extra mount complexity.

### Changed

- **Persona densified** (`preset/agent.cordis.yml`). All nine capability
  sections of the 0.1.2 fusion text are preserved in meaning — priority
  adjudication, uncertainty handling, completeness guarantees,
  placeholder/env annotation, risk/rollback, DSH-tool distillation, override
  rule, and the pinned first sentence ("不压缩代码/命令/公式/关键步骤的完整性")
  that the unit-test contract asserts — while redundant phrasing is removed.
  Measured: ~1,098 chars (0.1.2) -> 738 chars (0.2.0), ~33% fewer system
  tokens per request before cache.
- **`tool-bootstrap` disabled by default** (`disabled: true`). The DSH rc.5+
  product default already anchors the first request to shell+read; this preset
  no longer owns a duplicate. Re-enable by removing `disabled: true` when the
  host composition lacks an anchored bootstrap. The module and its 10 unit
  tests remain.
- **README/README.zh-CN** rewritten around measured facts: no unverified
  output-compression claims; bootstrap is documented as delegated to the host
  default; host-tuning and benchmark procedures are first-class.
- `preset/preset.yml` gains `version`/`compat` metadata.

### Added

- `scripts/install.mjs` — one-command host tuning for `~/.dsh/settings.yaml`
  (`reasoningEffort`, `agent-presets.default`) with backup + rollback,
  dry-run by default. Docs: `docs/HOST-TUNING.md`.
- `bench/run.mjs` — zero-dependency metrics aggregator over DSH session logs
  (system chars, tool surface, input/output/reasoning/cache tokens, TTFB,
  final-answer size). Docs: `docs/BENCHMARK.md`. This closes the project's
  measurement gap: the repo now ships a method to verify effects instead of
  asserting them.
- `CHANGELOG` history for 0.1.x preserved below.

### Known gap (from the audit)

Output- and reasoning-token effects remain unproven: all compact-standard
sessions on the audit host also switched provider (deepseek-official ->
opencode-go), so reasoning=0 and TTFB differences cannot be attributed to the
persona. `bench/run.mjs` + `docs/BENCHMARK.md` exist to close that gap with a
controlled run; until then, the only hard numbers are the system-prompt delta
(above, negative for the preset, positive for host tuning) and the persona's
instruction-compliance behavior.

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