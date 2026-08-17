# Benchmark procedure — measure, don't guess

This preset ships a measurement tool (`bench/run.mjs`) because none existed
when the project started. All numbers in EXPERIMENT.md and CHANGELOG came from
the same procedure. Run it on your own logs:

```sh
npm run bench                 # aggregate every session under $DSH_HOME/sessions
npm run bench -- <session-dir-or-file> [--json]
```

## Why a procedure

Persona effects are soft and model-dependent; system-prompt deltas are hard.
A/B results are only meaningful when the confounds below are controlled. The
original audit found exactly one such confound on the project host: every
compact-standard session also switched provider (deepseek-official ->
opencode-go), which made reasoning/latency differences unattributable to the
persona.

## Setup

Record these fixed across both arms:

- same provider AND same model id AND same reasoningEffort
- same host, same DSH version, same sandbox policy
- same task type and comparable task size
- fresh session per arm

## Metrics

`bench/run.mjs` prints one row per session:

| Column | Source | Meaning |
|---|---|---|
| sysChars | `request/header.header.system` | deterministic per preset |
| tools#1 | same record's `tools` array | bootstrap check |
| avgIn / avgOut | `assistant/message.usage` | provider-reported per step |
| avgReason | `usage.reasoningTokens` | 0 only meaningful on the same provider |
| cacheRead | `usage.cacheReadTokens` (sum) | real billed input = inputTokens − cache hits |
| avgFinalOut | text-only final `assistant/message` per step | verbosity proxy |
| ttfbMs | `step/start.time` → first `assistant/chunk` | latency proxy |

## Reading results

Per arm report: billed input/step (`avgIn − cacheRead/step`), output/step split
into reasoning and visible, median TTFB, and mean final-answer tokens. If the
provider differs between arms, everything except `sysChars`/`tools#1` is
inconclusive — that is exactly what happened in the project's own audit.

## Reference values (project host, 2026-08-17 audit)

| Arm | sysChars | tools#1 | avgIn/step | avgOut/step | avgReason/step | median TTFB |
|---|---|---|---|---|---|---|
| anchored-standard (default) | 46 | pwsh+read | 1,379–8,141 | 362–531 | 85–202 | 0.6–3.4 s |
| compact-standard 0.2.0 | ~7,022 | pwsh+read | ~6,700 | ~840 | 0 (unattributed: provider switch) | 1.8–9.4 s (unattributed) |

## Decision rule

Adopt/keep this preset when, with confounds controlled, visible output tokens
or billed input tokens per completed task are lower or equal AND task success
is not worse. There is no other valid criterion.