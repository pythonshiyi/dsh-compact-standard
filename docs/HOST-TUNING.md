# Host-level tuning — where the real token savings live

A preset cannot own host-plane configuration. The knobs below are larger than
anything a persona can do, and are the honest answer to "how do I actually
cut tokens". Everything here is user-owned config; `scripts/install.mjs`
applies it with backup and rollback (dry-run by default).

## Summary of what is measurable on a stock install

| Knob | Where | Effect (measured on this project's host) |
|---|---|---|
| `reasoningEffort` down-tuning | `~/.dsh/settings.yaml` → `agent-default-model` | Baseline sessions burned 85–3,890 reasoning tokens per step (output-priced). Lowering the budget removes most of it. |
| `agent-presets.default` | `~/.dsh/settings.yaml` | Selects this preset for new sessions. |
| `includeHarnessIdentity: false` | host composition only | Removes ~4.5K chars of identity prose per request — **but on stock installs there is no user-level file to set it**; the text lives inside the compiled DSH app. Only mounts that ship their own `base.cordis.yml` composition (custom host) can use it. A preset cannot own this. See below. |
| Tool-description trimming | custom preset | The single largest per-request lever; out of scope of the Standard snapshot. |

## One-command tuning

```sh
npm run install:tune        # dry-run: prints the change, writes nothing
npm run install:tune -- --reasoning low --preset compact-standard --apply
npm run install:verify
npm run install:rollback    # + --apply to actually restore the latest backup
```

`--reasoning off|low|medium|high|max` sets `agent-default-model.reasoningEffort`.
Note it only affects routes that emit reasoning tokens — the opencode-go route
on this host already returns `reasoningTokens: 0` regardless (measured), so the
knob matters for the `deepseek-official` route.

## Manual edit (equivalent)

```yaml
# ~/.dsh/settings.yaml
agent-presets:
  default: compact-standard
agent-default-model:
  provider: deepseek-official   # or opencode-go
  model: deepseek-v4-flash
  reasoningEffort: low          # was max
```

Backup the file before editing. Rollback = restore the backup; no other state
is touched.

## Custom-host installs only: dropping the identity opener

`includeHarnessIdentity: false` on the host `@deepseek-ai/dsh-system-prompt`
row (base.cordis.yml) removes the identity opener while preserving persona and
plan-mode sections. It is NOT settable from a preset and NOT present in
`settings.yaml`. Use it only if you run a custom host composition; on stock
installs this text is compiled into the app, and the option does not exist at
user level.

## Ordering note

Do the `settings.yaml` tuning first: it is worth multiples of the persona text
(~0.7K tokens) this preset adds, and it is reversible in one line. Then measure
with `npm run bench` (see docs/BENCHMARK.md) before and after to confirm the
effect on your workload.