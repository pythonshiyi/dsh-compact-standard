# dsh-compact-standard

[![License](https://img.shields.io/github/license/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/blob/main/LICENSE)
[![dsh-plugin](https://img.shields.io/badge/GitHub-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![GitHub release](https://img.shields.io/github/v/release/pythonshiyi/dsh-compact-standard)](https://github.com/pythonshiyi/dsh-compact-standard/releases)

[English](./README.md) | [GitHub](https://github.com/pythonshiyi/dsh-compact-standard)

一个 DeepSeek Harness agent preset：完整 **Standard** 工具目录 + 高密度**压缩式输出**
专家提示词。默认极致压缩思考与输出 token，但不降低能力、不压缩代码/命令/公式/
关键步骤的完整性。

这是社区项目，并非 DeepSeek 官方 preset，也不代表 DeepSeek 的认可或背书。

## 作用

- 注入严格、标准化的中文专家 persona，覆盖九节能力：
  思考压缩、输出压缩、优先级裁决（准确性 > 清晰度 > 简洁性）、完整性保证
  （禁伪代码/省略号、占位符与环境标注）、不确定性处理（信息不足须声明、
  假设显式标注）、风险提示与回滚义务、DSH 工具结果提炼、以及"对话内明确指令
  可覆盖默认压缩"的覆盖规则。
- 保留完整 Standard 工具目录，不降低能力。
- **v0.3.0 确定性省 token 杠杆**（实测，见 EXPERIMENT.md §9）：
  - `tool-compact`：装配期对模型面工具/参数描述做白名单式压缩。结构键、
    未命中工具与未命中参数逐字节不变；运行失败降级为原目录。实测真实
    25 工具目录：**26,638 → 21,963 字符（−17.6%，每请求省约 4.7K 字符，
    未缓存前约 1.2K+ tokens）**，结构零漂移（测试断言）。执行仍走注册表
    自身定义——只改写模型看到的字符串。其行下加 `disabled: true` 即可
    与原始目录做干净 A/B。
  - `tool-bootstrap` **重新默认启用**：v0.2.0 以「host 默认已提供等价首请求
    锚定」为由禁用，本机实测证伪——关闭自带 bootstrap 后首个请求暴露完整
    25 工具目录（33.7K 字符 header vs 启用时 12.1K；bench 中
    session-881eba9a vs session-6c0b72a4），且「先读后写」边界丢失。
    2 工具锚定此前只存在于本 preset 自带 bootstrap 提供之时。
- 针对 DSH 的优化（v0.2.0 起严格按实测口径）：
  - `dsh-persona` 使用普通 section（**不使用** `complete: true`），plan mode 等
    协作提示词段仍然生效；`includeRuntimeContext: false` 保持提示词精简。

## 实测口径（v0.3.0，见 EXPERIMENT.md §9 与 docs/BENCHMARK.md）

| 项 | 实测数值（本机、DSH rc.6、deepseek-v4-flash） |
|---|---|
| persona 注入 | 是（会话 system prompt 逐字命中） |
| persona 长度 | 738 字符（9 节能力全保留） |
| 工具目录大小/请求 | `tool-compact` 下 26,638 → 21,963 字符（**−17.6%**，结构键不动，25/25 工具保留） |
| 首请求工具面 | 启用 bootstrap：2 工具（pwsh+read）；禁用则首请求全 25 工具（33.7K 字符 header） |
| 系统提示 | 默认 46 字符 → 本 preset 约 7,022 字符（未缓存每请求 +2.4–2.6K tokens，缓存摊薄） |
| 输出/reasoning | 本机数据被 provider 切换混淆（opencode-go），**不做归因**；结论：需 `bench/run.mjs` 受控 A/B 才能判定 |

**诚实结论**：本 preset 的确定性作用是 (a) 工具目录压缩（tool-compact，
实测 −17.6%，是 preset 层可拥有的最大每请求杠杆）、(b) 首请求 2 工具锚定
（bootstrap）、(c) persona（软性指令，影响输出风格与思考倾向）。其余未计费
输入的大头在 host 层；配合 `scripts/install.mjs` 做 host 调优后收益远大于
persona 本身（见 docs/HOST-TUNING.md）。

## 系统提示词

本 preset 安装以下专家提示词（preset 内为中文原文；英文译本见 README.md）：

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

> 注：stock 安装下，DeepSeek Harness 会在 persona 前附加固定身份开场白（约 4.5K
> 字符）。该文本编译在应用内，`settings.yaml` 无对应开关；仅自定义 host 组合
> （自带 base.cordis.yml）可通过 `includeHarnessIdentity: false` 移除，见
> docs/HOST-TUNING.md。

## 兼容范围

- DeepSeek Harness `0.1.0-rc.5`（提交
  [`47f9438`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)）
  与 `0.1.0-rc.6`（node_modules API 层实测）验证通过；上游 `rc.7`
  （2026-08-17 发布）尚未验证。
- Node.js >= 22.19（bench/install 脚本需 22.2+ zstd；tests 需 22.19+）。
- Windows（本机验证）/ POSIX（脚本零依赖通用）。

DeepSeek Harness 目前仍是开发者预览版，官方明确说明未来会有破坏性变更。升级
Harness 后应先对照上游改动再继续使用。

## 安装

### 方式 A：预设 + host 调优（推荐）

```sh
git clone https://github.com/pythonshiyi/dsh-compact-standard.git
cd dsh-compact-standard
npm run install:tune   # dry-run：查看将对 ~/.dsh/settings.yaml 做的改动
npm run install:tune -- --reasoning low --preset compact-standard --apply
```

`--apply` 会先备份 `settings.yaml`（`settings.yaml.bak-<时间戳>`）；回滚：
`npm run install:rollback -- --apply`。详情与手动编辑等价方案见
docs/HOST-TUNING.md。

### 方式 B：仅复制 preset

PowerShell：

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

完整重启 DeepSeek Harness，新建空 session，选择 **Compact Standard (compressed
expert)**。不要在已经产生内容的会话中途切换 preset。

## 验证

- 静态：`npm test`（persona 9 节断言、bootstrap 默认启用与 tool-compact 挂载
  断言、工具目录完整性、真实 25 工具 fixture 上的结构零漂移与压缩率回归）。
- 运行时：`npm run bench [<会话目录或文件>]`——从 `~/.dsh/sessions` 的
  zstd 日志聚合每个会话的系统提示长度、工具 schema 大小（`toolsChars`，验证
  相对原始目录的 −17.6%）、首请求工具面、输入/输出/reasoning/缓存 tokens、
  首字延迟、最终答复长度。首请求 system prompt 应包含压缩规则且其
  `toolsChars` 为压缩值；对比同一 provider/model/reasoningEffort 下的基线
  会话方可判定效果（doc 见 docs/BENCHMARK.md）。

## 重要行为

- `tool-bootstrap` **默认启用**（v0.2.0 基于被证伪的「host 默认已提供」假设将其
  禁用，实测反例见 EXPERIMENT.md §9）。`promoteOn: either` 保证请求 #2 起恢复
  完整目录（纯文字首答也能晋升）。仅当你的 host 组合可证明自带首请求锚定时
  才应禁用。
- `tool-compact` 只改写白名单描述；未命中工具与未命中参数逐字节通过，结构键
  永不触碰，装载/运行失败降级为原目录（单测覆盖）。其行下 `disabled: true`
  可得到干净的 A/B 对照臂。
- 工具目录只变化一次，因此第一、二次请求之间会发生一次前缀缓存变化。
- 插件不发起网络请求，也不增加遥测。
- preset 与 shell 访问具有相同信任等级，安装前应自行审阅文件。

## 官方生态要求

DeepSeek 当前建议社区作者把插件放在自己的 GitHub 项目中，并为仓库添加
[`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 方便发现。官方仓库目前
不接受外部 PR，也没有强制社区插件仓库模板。原文见官方
[`CONTRIBUTING.zh.md`](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/CONTRIBUTING.zh.md)。

## 许可证

MIT。`preset/agent.cordis.yml` 基于 DeepSeek Harness Standard preset 与社区
`dsh-anchored-standard` preset 修改，原始版权和 MIT 许可声明保留在
[`NOTICE`](./NOTICE) 中。