import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const agentPath = join(root, 'preset', 'agent.cordis.yml')
const presetPath = join(root, 'preset', 'preset.yml')

const agent = readFileSync(agentPath, 'utf8')
const preset = readFileSync(presetPath, 'utf8')

test('preset metadata identifies Compact Standard', () => {
  assert.match(preset, /name:\s*Compact Standard/)
  assert.match(preset, /compressed expert/)
})

test('preset metadata carries a version', () => {
  assert.match(preset, /version:\s*0\.3\.0/)
  assert.match(preset, /compat:/)
})

test('persona uses the compact-output expert prompt', () => {
  assert.match(agent, /text:\s*\|/)
  assert.match(agent, /极致压缩思考与输出/)
  assert.match(agent, /不压缩代码/)
  assert.match(agent, /结论先行/)
  assert.match(agent, /【DSH 工具】/)
  // v0.2.0 densified persona keeps every capability section
  for (const section of ['【思考】', '【输出】', '【优先级】', '【完整性】', '【不确定性】', '【风险】', '【DSH 工具】', '【覆盖规则】']) {
    assert.ok(agent.includes(section), `missing persona section ${section}`)
  }
})

test('DSH optimizations are enabled', () => {
  // `complete: true` would suppress plan-mode and other sections; must NOT be set.
  assert.doesNotMatch(agent, /^\s*complete:\s*true\s*$/m)
  assert.match(agent, /includeRuntimeContext:\s*false/)
  assert.match(agent, /tool-bootstrap/)
})

test('tool-bootstrap is enabled by default (v0.2.0 regression fixed)', () => {
  const boot = agent.split(/- id:\s*tool-bootstrap/)[1].split(/- id:\s*tool-compact/)[0]
  // Strip comment lines: `disabled: true` may appear in prose ("Set disabled:
  // true to A/B") but must not be an actual mounted config key.
  const code = boot.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n')
  assert.doesNotMatch(code, /disabled:\s*true/)
  assert.match(code, /promoteOn:\s*(either|tool-call|assistant-message)/)
  assert.match(code, /shellTools:\s*\[bash, pwsh\]/)
  assert.match(code, /commonTools:\s*\[read\]/)
})

test('tool-compact is mounted and enabled by default', () => {
  assert.match(agent, /- id:\s*tool-compact/)
  const block = agent.split(/- id:\s*tool-compact/)[1].split(/- id:\s*tool-bash/)[0]
  assert.match(block, /name:\s*\.\/tool-compact\.mjs/)
  assert.doesNotMatch(block, /disabled:\s*true/)
})

test('plan-mode section remains active', () => {
  assert.match(agent, /id:\s*plan-mode/)
  assert.match(agent, /name:\s*'@deepseek-ai\/dsh-plan-mode'/)
  assert.match(agent, /You are in plan mode/)
})

test('full Standard tool catalog remains present', () => {
  for (const tool of ['tool-bash', 'tool-pwsh', 'tool-fs', 'tool-fs-search', 'tool-jobs', 'tool-skill', 'tool-goal', 'tool-subagent', 'tool-workflow', 'tool-ask-user', 'tool-todo', 'tool-web']) {
    assert.match(agent, new RegExp(`id:\\s*${tool}`))
  }
})

test('v0.3.0 measurement tooling ships with the repo', () => {
  for (const f of ['scripts/install.mjs', 'bench/run.mjs', 'docs/HOST-TUNING.md', 'docs/BENCHMARK.md', 'preset/tool-compact.mjs', 'test/fixtures/tools-25.json']) {
    assert.ok(existsSync(join(root, f)), `missing ${f}`)
  }
})