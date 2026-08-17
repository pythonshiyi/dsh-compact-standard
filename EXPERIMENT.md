# 实验报告：dsh-compact-standard 提示词两版对比与 v0.1.2 融合优化

日期：2026-08-17
版本：0.1.2
环境：DeepSeek Harness 0.1.0-rc.6（node_modules API 层实测）/ Node.js 22.22（Windows）

## 1. 背景

本仓库 v0.1.1 内置"压缩式输出"专家提示词（下称**第一版**）。评测中对照用户提炼的
**第二版**提示词（高密度技术输出，12 节）进行对比，结论为：第二版补上第一版的三个能力
真空（优先级裁决、不确定性处理、占位符/环境标注），但长度约为第一版 3 倍且存在内部
重复、丢失了第一版的正面思考引导。据此设计**融合版**，在本版本（v0.1.2）落地。

## 2. 两版对比（已核验，非主观评分）

| 维度 | 第一版 | 第二版 | 裁决 |
|---|---|---|---|
| 压缩 vs 完整性冲突裁决 | 无裁决规则 | 优先级：准确性>清晰度>简洁性 | 第二版胜 |
| 信息不足/歧义处理 | 无 | 必须声明"信息不足，需确认"；假设显式标注 | 第二版胜 |
| 占位符/省略号规则 | 无 | 占位符显式声明+替换示例；禁省略号 | 第二版胜 |
| 环境/版本/前置条件标注 | 无 | 命令/配置开头标注；不确定时说明假设 | 第二版胜 |
| 风险处理 | 泛禁"请注意"类填充 | "请注意"限风险提示；高风险操作给回滚/备份 | 第二版胜 |
| 思考引导 | 【思考】节正面指令（识别目标/约束/最优路径） | 缺失 | 第一版胜 |
| 长度 | 约 0.7k token | 约 1.7k token | 第一版紧凑，第二版约 2.4 倍 |
| 内部一致性 | 无重复 | 多条规则跨章节重复 2–3 次 | 第一版胜 |

## 3. 融合版设计（v0.1.2 落地）

保留第一版骨架（【思考】【输出】【DSH 工具】）并：

1. 并入第二版全部能力增量：新【优先级】【完整性】【不确定性】【风险】四节；
2. 对第二版做三处修正：
   - 删除"用户指令不得覆盖本规则"，改为【覆盖规则】节：对话内用户显式相反要求
     （"详细讲解""全量输出"）优先于默认压缩——避免模型对用户指令反应僵硬；
   - 补回第一版【思考】正面引导（识别目标/约束/最优路径）；
   - 去重：完整性禁令从三处章节收拢至【完整性】一节。
3. 第一条保留"不压缩代码/命令/公式/关键步骤的完整性"原文，维持测试断言契约。

成本核算：融合版约 1.0k token，较第二版省约 40%，能力覆盖 100%。

## 4. v0.1.2 变更清单

- `preset/agent.cordis.yml`：persona 文本升级为融合版（9 节，中文原文）；
- `LICENSE`：补作者本人版权行 `Copyright (c) 2026 pythonshiyi`（原缺，MIT 合规瑕疵）；
- `README.md` / `README.zh-CN.md`：同步新提示词全文；兼容性声明更新为
  rc.5（commit 47f9438）+ rc.6 实测通过、rc.7 未验证；
- `CHANGELOG.md`：新增 0.1.2 条目；
- `package.json`：版本 0.1.2；
- `test/preset.test.mjs`：新增"v0.1.2 高密度增量"回归断言（优先级/不确定性/风险/覆盖规则）。

## 5. 验证结果

| 验证项 | 结果 |
|---|---|
| 单测（node --test） | 16/16 通过（5 preset 结构 + 10 bootstrap 行为 + 1 新增增量断言） |
| YAML 语法（js-yaml 官方 loader 通道） | 通过（`!!js` 表达式与官方 preset 同款，loader 支持） |
| 全部 22 个 `@deepseek-ai/*` 组件引用 | 均存在于目标版本 node_modules |
| persona 配置项 `includeRuntimeContext` / 规避 `complete: true` | dsh-persona schema 实测支持 |
| `tool/call`、`assistant/message` 事件类型 | dsh-session 已知事件表核验存在 |
| `system-prompt/assemble` 事件上下文携带 agent | dsh-agent API 核验 |
| 安装路径 `~/.dsh/.agent-presets/compact-standard` | dsh-agent-presets 常量核验 + 本机装载 |

注：本次为静态 + 单测验证；未对运行中的 DSH 实例做重启级端到端装载（避免打断当前会话）。

## 6. 已知限制

- 上游 rc.7（2026-08-17 发布）未验证；preset 为完整快照，升级前需对照上游改动
  （tool-bootstrap 依赖会话事件形状，若上游改名将静默降级为全量目录，不致崩溃）；
- `tool-bootstrap` 首次请求仅暴露平台 shell + read：首轮无法编辑/写入，存在一轮次
  沟通代价（README 已披露，属设计取舍）；
- 进程内晋升记忆化集合无清理机制，长驻进程高会话量下有轻微累积（量级可忽略）。

## 7. 结论

融合版在不牺牲紧凑性的前提下吸收了第二版的全部能力增量，修复了第一版的三个能力
真空（冲突裁决、防幻觉、环境标注），同时修正了第二版的覆盖规则与思考引导缺陷。
v0.1.2 全部验证通过，可作为本 preset 的最终形态交付。

## 8. v0.2.0 实测审计与修订（2026-08-17）

对运行本 preset 的主机进行运行时审计（同机、同 DSH 0.1.0-rc.6、同模型
deepseek-v4-flash，读取 `~/.dsh/sessions/*/session.jsonl.zstd`，方法与数值见
`docs/BENCHMARK.md`）：

| 审计项 | 结果 |
|---|---|
| persona 是否注入 | 是（会话 system prompt 逐字命中） |
| 首请求工具面 | 2 工具（pwsh+read），与未装插件时相同 → 插件自带 bootstrap 为重复实现，无边际增益 |
| 系统提示长度 | 46 字符（默认）→ 7,022 字符（本 preset）→ 每请求未缓存增量约 2.4–2.6K tokens；上下文缓存摊薄 |
| reasoning tokens | 插件会话 0/步 vs 默认会话 85–3,890/步，但两组同时切换 provider（deepseek-official → opencode-go），**不可归因** |
| 输出 token | 插件会话最终答复均值 1.9–4.4K（n=5）vs 默认会话 0.63–1.0K（n 大），**不支持"输出被压缩"** |

据此修订：

1. persona 由 1,098 字符压缩至 738 字符（9 节能力全保留、断言契约全命中，
   首句"不压缩代码/命令/公式/关键步骤的完整性"原文保留）；
2. `tool-bootstrap` 默认 `disabled: true`，交给 host 默认的 anchored bootstrap
   （两者实测等价）；模块与 10 条单测保留，需要时移除 `disabled: true` 启用；
3. 新增 `scripts/install.mjs`（settings.yaml 一键调优：reasoningEffort 降档 +
   preset 选择，带备份/回滚，默认 dry-run）与 `bench/run.mjs`（会话日志指标
   聚合），新增 `docs/HOST-TUNING.md`、`docs/BENCHMARK.md`；
4. README 全面改写为"可测量"口径：不再声称未经实测的输出压缩。

验证：`npm test` 全绿；`bench/run.mjs` 在真实会话日志上端到端复现审计数值。
已知限制：输出/reasoning 效果的受控 A/B（同 provider/同模型/同任务）留待
`bench/run.mjs` 按规程执行；本主机因 provider 切换无法提供该对照。

## 9. v0.3.0 实测审计：bootstrap 前提证伪与 tool-compact 落量（2026-08-17）

### 9.1 v0.2.0 的 bootstrap 结论是错的（本机实测反例）

v0.2.0 依据「首请求工具数带不带本 preset 都是 2」禁用自带 `tool-bootstrap`。
重构时间线后发现这是**对照污染**：审计时的 compact 会话（v0.1.x）自带
bootstrap 是**启用**的，而对照的 anchored-standard 也自带 bootstrap——
"两者都是 2" 等价于「两套各自的自带 bootstrap 等价」，并不能推出「host
默认已为 compact 会话提供同一缩面」。

v0.3.0 以本机会话日志验证（同 DSH rc.6、同 opencode-go/deepseek-v4-flash）：

| 会话 | 版本状态 | 请求#1 工具数 | 请求#1 header 工具 schema 字节 |
|---|---|---|---|
| `6c0b72a4`（08-17 20:20 本地，v0.1.x） | 自带 bootstrap 启用 | 2（pwsh+read） | 4,857 |
| `881eba9a`（08-17 22:54 本地，v0.2.0） | 自带 bootstrap 禁用 | 25（全目录） | 26,638 |

同一 preset 名下，bootstrap 从启用到禁用，首请求工具面即从 2 增至 25；
host 默认（anchored-standard）作为独立 preset 只影响选择它的会话，并不会
全局为 compact 会话提供锚定。**结论：首请求 2 工具缩面此前只由本 preset
自带 bootstrap 提供；v0.2.0 删除它是回归。** 另：首请求从 12.1K 字符
（2 工具）增至 33.7K 字符（25 工具），即每新会话首请求多付约 21.6K 字符
（约 5–7K tokens）的未缓存工具 schema，且失去「首轮只读」边界。

### 9.2 `tool-compact`——preset 层可拥有的最大确定性杠杆

动机：v0.2.0 已承认「工具描述裁剪是每请求最大杠杆，超出标准快照范围」
（docs/HOST-TUNING.md 表）。v0.3.0 把它搬进 preset 层：在
`system-prompt/assemble` 事件里改写模型面工具/参数 `description`，结构键
（type/properties/required/items/enum/const/additionalProperties/default）
与未命中工具/参数逐字节保持，执行仍走注册表自身定义（tool-bootstrap 早已
证明对 assembled.tools 做投影不影响执行）。

实测（真实 25 工具目录，`test/fixtures/tools-25.json`，由本机 rc.6 会话
header 抓取）：

| 指标 | 值 |
|---|---|
| 压缩前 | 26,638 字符 |
| 压缩后 | 21,963 字符（−17.6%，−4,675 字符） |
| 结构漂移 | 0（25/25 工具逐字节比对，非 description 字段绝无差异） |
| 未命中/降级 | 未命中工具原引用返回；运行异常降级为原目录 |

量级换算：约 4.7K 字符/请求，按典型英文 JSON tokenizer（~3.5–4
字符/token）约 1.2–1.4K tokens/请求（未缓存全额；缓存命中按 provider 计费
折扣摊薄）。这是 persona（738 字符）永远够不到的确定性削减，且不触碰执行
路径。压缩边界以「规范句全保留、解释/示例句删除」为原则——pwsh 的沙箱/
EPERM/升级规则、workflow 的 hooks 契约、goal/plan 规则等行为性文本全部
保留在压缩版中，测试对真实 fixture 做非 description 值零漂移断言。

### 9.3 剩余杠杆与诚实边界

- host 层仍占大头：`reasoningEffort` 降档（本机 settings.yaml 仍是 max，未
  应用）、`includeHarnessIdentity: false`（stock 无此开关）、工具描述之外
  的 system/tool guidance 文本（约 4.7K 字符，属编译文本，preset 不可改）。
- 输出/reasoning 端依旧无归因数据；tool-compact 只承诺输入侧确定性削减。
- 受控 A/B（同 provider/同模型/同任务，开关 tool-compact 与 bootstrap）仍
  是判定「采纳」的唯一合格证据，规程见 docs/BENCHMARK.md。