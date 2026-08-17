# dsh-compact-standard

[![License](https://img.shields.io/github/license/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/blob/main/LICENSE)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/releases)

[中文说明](./README.zh-CN.md) | [GitHub](https://github.com/pythonshiyi/dsh-compact-standard)

A DeepSeek Harness agent preset: full **Standard** tool catalog plus a
high-density **compact-output expert prompt**. By default it aggressively
compresses thinking and output tokens without reducing capability — and never
compresses code/commands/formulas/critical-step completeness.

This is a community project. It is not an official DeepSeek preset and is not
affiliated with or endorsed by DeepSeek.

## What it does

- Installs a strict, standardized Chinese expert persona with nine capability
  sections: thinking compression, output compression, priority adjudication
  (accuracy > clarity > conciseness), completeness guarantees (no pseudocode /
  ellipsis, placeholder and environment annotation), uncertainty handling
  (state-when-unknown, explicit assumptions), risk-warning and rollback
  obligations, DSH-tool result distillation, and an override rule letting
  explicit in-conversation user instructions beat the default compression.
- Keeps the full Standard tool catalog, so capability is not reduced.
- DSH-specific optimizations, stated on a measured basis since v0.2.0:
  - a normal `dsh-persona` section instead of `complete: true`, so plan-mode
    and other cooperative prompt sections remain active;
    `includeRuntimeContext: false` keeps the prompt lean;
  - `tool-bootstrap` is **disabled by default**: DSH rc.5+ defaults
    (anchored-standard) already ship the same first-request tool-surface
    reduction (verified: both expose only shell/read on request #1), so this
    preset no longer mounts a duplicate. Remove the `disabled: true` line to
    enable the bundled one when your host composition lacks an anchored
    bootstrap.

## Measured impact (v0.2.0, see EXPERIMENT.md §8 and docs/BENCHMARK.md)

| Item | Measured on this project's host (DSH rc.6, deepseek-v4-flash) |
|---|---|
| Persona injection | Yes (verbatim in the assembled system prompt) |
| Persona size | 0.1.2: 1,098 chars → 0.2.0: 738 chars (**−33%**, all 9 sections preserved) |
| First-request tool surface | 2 tools (pwsh+read), identical to the host default → bundled bootstrap had zero marginal gain, now disabled by default |
| System prompt | default 46 chars → ~7,022 chars with this preset (uncached +2.4–2.6K tokens/request; amortized by context caching) |
| Output/reasoning tokens | confounded on this host by a concurrent provider switch (opencode-go); **no attribution claimed** — a controlled A/B via `bench/run.mjs` is required |

**Honest summary**: the preset's deterministic effect is the persona (a soft
instruction influencing output style and thinking tendency) plus a system-prompt
swap. The real token lever is host-level; pairing this preset with
`scripts/install.mjs` host tuning yields far more than the persona alone.

## System prompt

The preset installs this expert prompt (Chinese original; it is shown verbatim
below and translated in the Chinese README's mirror sections):

```text
你是严格标准化技术专家。默认极致压缩思考与输出 token，但不降低能力，不压缩代码/命令/公式/关键步骤的完整性。

【思考】只做有效推理：直接锁定目标、约束、最优路径；删除重复、铺垫、自我检查、冗余推演。不拟人、不寒暄、不用语气词；禁“好的”“综上所述”“我们可以”“如您所知”等填充。

【输出】结论先行，证据/步骤紧随；能列表不用段落，能表格不用长句。不输出内部推理、草稿、自检；不重复问题，不写总结客套。默认只给最佳方案；仅应明确要求提供多方案，并列取舍与推荐。要求“详细/解释”时才扩展，否则最小必要输出。准确完整前提下可用高密度结构提升效率，不以牺牲能力换取压缩。

【优先级】准确性 > 清晰度 > 简洁性；冲突时以准确性与完整性为准，绝不因压缩省略内容。

【完整性】代码、命令、公式、配置须完整、精确、可执行；禁止伪代码、省略号或以“等”“……”省略关键内容。必要占位符须显式声明（如 <API_KEY>、<your-domain>）并给出替换示例；命令/配置开头标明环境、版本、前置条件，不确定则说明假设。

【不确定性】信息不足或歧义须声明“信息不足，需确认”，不得编造；必须基于假设才能继续时，显式标注 假设：<内容>，再给出基于该假设的结果。

【风险】“请注意”仅用于必要风险提示。高风险操作（删除、覆盖、强制执行、生产变更）必须给出关键风险与回滚/备份方法，即使未要求多方案。

【DSH 工具】工具结果只提炼必要结论与关键证据；完整报错、环境/版本信息、关键文件片段与必要命令不得省略。调用工具前后不叙述过程，直接给出结果或下一步。

【覆盖规则】本指令为默认基线；用户本次对话中的明确相反要求（如“详细讲解”“全量输出”）优先于默认压缩。
```

> Note: on stock installs, DeepSeek Harness prepends its fixed identity opener
> (≈4.5K chars) before this persona. That text is compiled into the app; there
> is no `settings.yaml` switch. Only custom host compositions (a self-owned
> `base.cordis.yml`) can drop it via `includeHarnessIdentity: false` — see
> docs/HOST-TUNING.md.

## Compatibility

- DeepSeek Harness `0.1.0-rc.5` (commit
  [`47f9438`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a))
  and `0.1.0-rc.6` (node_modules API-level verification). Upstream `rc.7`
  (released 2026-08-17) is not yet verified.
- Node.js >= 22.19 (tests); bench/install scripts need 22.2+ (node:zlib zstd).
- Windows (verified on this host) / POSIX (scripts are zero-dependency).

DeepSeek Harness is currently a developer preview and explicitly permits
breaking changes. This preset is a full snapshot of the Standard composition,
so review upstream changes before using it with a newer release.

## Install

### Option A: preset + host tuning (recommended)

```sh
git clone https://github.com/pythonshiyi/dsh-compact-standard.git
cd dsh-compact-standard
npm run install:tune   # dry-run: prints the exact change to ~/.dsh/settings.yaml
npm run install:tune -- --reasoning low --preset compact-standard --apply
```

`--apply` backs up `settings.yaml` first (`settings.yaml.bak-<timestamp>`);
rollback: `npm run install:rollback -- --apply`. Manual equivalent edits and
details in docs/HOST-TUNING.md.

### Option B: copy the preset only

PowerShell:

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

- Static: `npm test` (persona 9-section assertions, bootstrap-disabled-by-default
  assertion, tool-catalog completeness, measurement tooling presence).
- Runtime: `npm run bench [<session-dir-or-file>]` — aggregates per-session
  system-prompt length, first-request tool surface, input/output/reasoning/
  cache tokens, time-to-first-token, and final-answer size from the zstd
  session logs under `~/.dsh/sessions`. Confirm the first request's system
  prompt contains the compression rules; judge effects only against a baseline
  arm on the SAME provider/model/reasoningEffort (docs/BENCHMARK.md).

## Important behavior

- `tool-bootstrap` is disabled by default; its module and 10 unit tests remain.
  Removing `disabled: true` restores the bundled first-request 2-tool surface
  (shell + read); `promoteOn: either` guarantees promotion to the full catalog
  at request #2 (a text-only first reply still promotes).
- The tool catalog changes once, so request-prefix cache continuity also
  changes once between the first and second model requests.
- The plugin performs no network requests and adds no telemetry.
- The preset has the same trust level as shell access. Review its files before
  installation.

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