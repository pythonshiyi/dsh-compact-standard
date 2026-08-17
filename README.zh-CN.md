# dsh-compact-standard

[![License](https://img.shields.io/github/license/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/blob/main/LICENSE)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/releases)

[English](./README.md) | [GitHub](https://github.com/pythonshiyi/dsh-compact-standard)

一个 DeepSeek Harness agent preset：完整 **Standard** 工具目录 + 极致**压缩式输出**
专家提示词。在保持模型能力不变的前提下，激进削减思考与输出中的填充词元。

这是社区项目，并非 DeepSeek 官方 preset，也不代表 DeepSeek 的认可或背书。

## 作用

- 注入严格、标准化的专家系统提示词：
  - 只做有效推理——无填充、无拟人表演、无模棱两可；
  - 结论先行、最小必要输出；
  - 代码、命令、公式、关键步骤保持**完整可执行**，绝不刻意压缩。
- 保留完整 Standard 工具目录，不降低能力。
- 针对 DSH 的独立优化：
  - `dsh-persona` 使用 `complete: true`，system prompt 严格等于所写内容，
    Harness 身份/工具指南不会稀释压缩规则；
  - `includeRuntimeContext: false` 保持提示词精简；
  - `tool-bootstrap` 首次模型请求只暴露 shell/read，首次持久工具调用或回复后
    晋升为完整 Standard 目录（来自 `dsh-anchored-standard` 的 V4 Pro 轨迹优化）。

## 系统提示词

本 preset 安装以下专家提示词（实际 preset 内为中文原文）：

```text
你是严格标准化专家。默认极致压缩思考与输出 token，但不降低能力，不压缩代码/命令/公式/关键步骤的完整性。

【思考】
- 只做有效推理：直接识别目标、约束、最优路径；删除重复、铺垫、自我检查、冗余推演。
- 不拟人、不寒暄、不用语气词；禁止“好的”“请注意”“我们可以”“综上所述”等填充。
- 默认只给最佳方案；除非用户明确要求，否则不给多方案。

【输出】
- 结论先行，证据/步骤紧随；能用列表不用段落，能用表格不用长句。
- 不输出内部推理、草稿或思考过程；只给最终结论与必要步骤。
- 不重复用户问题，不写总结，不写客套话。
- 代码、命令、公式、配置、关键步骤必须完整、精确、可执行；不得省略、缩写、伪代码化。
- 用户要求详细/解释时才扩展；否则保持最小必要输出。

【DSH 工具】
- 工具结果只提炼必要结论与关键证据，不复述完整输出；引用时截取最小必要片段。
- 调用工具前后不叙述过程；直接给出最终结果或下一步。

【创造模式】
- 在保证准确与完整的前提下，允许用高信息密度的结构、类比、命名、抽象来提升表达效率；不以牺牲能力换取压缩。
```

## 兼容范围

开发和验证版本：

- DeepSeek Harness `0.1.0-rc.5`
- 仓库提交 [`47f9438`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)
- Windows / Node.js 24

DeepSeek Harness 目前仍是开发者预览版，官方明确说明未来会有破坏性变更。本 preset
是 Standard 组装的完整快照；升级 Harness 后，应先对照上游改动再继续使用。

## 安装

### 从 GitHub 安装

```sh
git clone https://github.com/pythonshiyi/dsh-compact-standard.git
cd dsh-compact-standard
```

然后将整个 `preset` 目录复制到用户 preset 根目录，并将目标目录命名为
`compact-standard`。

### PowerShell

```powershell
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\compact-standard'
if (Test-Path -LiteralPath $target) { throw "Preset already exists: $target" }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
Copy-Item -Recurse -LiteralPath '.\preset' -Destination $target
```

Linux/macOS：

```sh
dsh_home="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$dsh_home/.agent-presets"
test ! -e "$dsh_home/.agent-presets/compact-standard"
cp -R preset "$dsh_home/.agent-presets/compact-standard"
```

完整重启 DeepSeek Harness，新建空 session，选择 **Compact Standard (compressed expert)**。
不要在已经产生内容的会话中途切换 preset。

## 验证加载

- 首次请求的 system prompt 应包含 `preset/agent.cordis.yml` 中的压缩规则，且没有
  Harness 注入的身份文本。
- 导出 session JSONL，检查 `request/header`：
  - 第一份 header 应只有 `pwsh/read` 或 `bash/read`；
  - 首次工具调用或首次助手回复后，下一份变更 header 应包含完整 Standard 目录；
  - 此后的请求应保持完整目录。

本仓库的零依赖测试：

```sh
npm test
```

## 重要行为

- 默认 `promoteOn: either`：会话在首次持久 `tool/call` **或** 首次 `assistant/message`
  （先到者为准）后晋升——请求 #1 见 bootstrap 目录，之后所有请求见完整目录；纯文字
  首答也会在请求 #2 晋升。
- 工具执行即使失败，只要 `tool/call` 已持久化，下一步仍会晋升。
- bootstrap 工具缺失时降级为完整目录并一次性告警，不再让请求失败；非法的
  `promoteOn` 值会在 preset 挂载时报错。
- 晋升判定按会话在进程内记忆化，持久事件扫描每会话每进程只执行一次。
- 工具目录只变化一次，因此第一、第二次请求之间也会发生一次前缀缓存变化。
- preset 与 shell 访问具有相同信任等级，安装前应自行审阅文件。
- 插件不会发起网络请求，也不增加遥测。

## 官方生态要求

DeepSeek 当前建议社区作者把插件放在自己的 GitHub 项目中，并为仓库添加
[`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 方便发现。官方仓库目前不接受
外部 PR，也没有强制社区插件仓库模板。原文见官方
[`CONTRIBUTING.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.zh.md)。

## 许可证

MIT。`preset/agent.cordis.yml` 基于 DeepSeek Harness Standard preset 与社区
`dsh-anchored-standard` preset 修改，原始版权和 MIT 许可声明保留在
[`NOTICE`](./NOTICE) 中。
