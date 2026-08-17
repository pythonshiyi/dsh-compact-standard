# dsh-compact-standard

[![License](https://img.shields.io/github/license/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/blob/main/LICENSE)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/releases)

[中文说明](./README.zh-CN.md) | [GitHub](https://github.com/pythonshiyi/dsh-compact-standard)

A DeepSeek Harness agent preset: full **Standard** tool catalog plus an
extreme **compact-output expert prompt**. It keeps model capability intact
while aggressively cutting filler thinking and output tokens.

This is a community project. It is not an official DeepSeek preset and is not
affiliated with or endorsed by DeepSeek.

## What it does

- Installs a strict, standardized expert system prompt:
  - effective reasoning only — no filler, no persona theater, no hedging;
  - conclusion-first output, minimum necessary verbosity;
  - code, commands, formulas, and critical steps stay **complete and
    executable** — never deliberately compressed.
- Keeps the full Standard tool catalog, so capability is not reduced.
- Adds DSH-specific optimizations:
  - `complete: true` on `dsh-persona` keeps the system prompt exactly as
    written, so Harness identity/per-tool guidance cannot dilute the rules;
  - `includeRuntimeContext: false` keeps the prompt lean;
  - `tool-bootstrap` exposes only shell/read on the first model request, then
    promotes to the full Standard catalog after the first durable tool call or
    reply (V4 Pro trajectory optimization from `dsh-anchored-standard`).

## Compatibility

Developed and tested against:

- DeepSeek Harness `0.1.0-rc.5`
- repository commit [`47f9438`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)
- Node.js 24 on Windows

DeepSeek Harness is currently a developer preview and explicitly permits
breaking changes. This preset is a full snapshot of the Standard composition,
so review upstream changes before using it with a newer release.

## Install

### From GitHub

```sh
git clone https://github.com/pythonshiyi/dsh-compact-standard.git
cd dsh-compact-standard
```

Then copy the entire `preset` directory into the user preset root under the id
`compact-standard`.

### PowerShell

```powershell
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\compact-standard'
if (Test-Path -LiteralPath $target) { throw "Preset already exists: $target" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -Recurse -LiteralPath '.\preset' -Destination $target
```

Linux/macOS:

```sh
dsh_home="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$dsh_home/.agent-presets"
test ! -e "$dsh_home/.agent-presets/compact-standard"
cp -R preset "$dsh_home/.agent-presets/compact-standard"
```

Fully restart DeepSeek Harness, create a blank session, and select
**Compact Standard (compressed expert)**. Do not switch an active session from
a different preset.

## Verify

- The first request's system prompt should contain the compression rules from
  `preset/agent.cordis.yml` and no Harness-injected identity text.
- Export the session JSONL and inspect `request/header` events:
  - the first header should contain only `pwsh/read` or `bash/read`;
  - after the first tool call or the first assistant reply, the next changed
    header should contain the full Standard catalog;
  - subsequent requests should keep that full catalog.

Run the local zero-dependency tests with:

```sh
npm test
```

## Important behavior

- With the default `promoteOn: either`, the session promotes after its first
  durable `tool/call` OR its first `assistant/message`, whichever comes first —
  request #1 sees the bootstrap catalog and every later request sees the full
  catalog. A text-only first reply therefore still promotes at request #2.
- A failed tool execution still promotes the session because the durable
  `tool/call` already exists.
- A missing bootstrap tool degrades to the full catalog with a one-time
  warning instead of failing requests; invalid `promoteOn` values fail at
  preset mount instead.
- Promotion decisions are memoized per session for the process lifetime.
- The tool catalog changes once, so request-prefix cache continuity also
  changes once between the first and second model requests.
- The preset has the same trust level as shell access. Review its files before
  installation.
- The plugin performs no network requests and adds no telemetry.

## Official ecosystem guidance

DeepSeek currently asks community plugin authors to publish plugins in their own
GitHub projects and add the [`dsh-plugin`](https://github.com/topics/dsh-plugin)
repository topic for discovery. The official repository does not currently
accept external pull requests and does not mandate a community repository
template. See the official
[`CONTRIBUTING.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.md).

## License

MIT. `preset/agent.cordis.yml` is derived from the DeepSeek Harness Standard
preset and the community `dsh-anchored-standard` preset; the original copyright
and MIT notices are retained in [`NOTICE`](./NOTICE).
