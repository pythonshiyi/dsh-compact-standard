import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
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

test('persona uses the compact-output expert prompt', () => {
  assert.match(agent, /text:\s*\|/)
  assert.match(agent, /极致压缩思考与输出/)
  assert.match(agent, /不压缩代码/)
  assert.match(agent, /结论先行/)
  assert.match(agent, /【DSH 工具】/)
})

test('DSH optimizations are enabled', () => {
  assert.match(agent, /complete:\s*true/)
  assert.match(agent, /includeRuntimeContext:\s*false/)
  assert.match(agent, /tool-bootstrap/)
})

test('full Standard tool catalog remains present', () => {
  for (const tool of ['tool-bash', 'tool-pwsh', 'tool-fs', 'tool-fs-search', 'tool-jobs', 'tool-skill', 'tool-goal', 'tool-subagent', 'tool-workflow', 'tool-ask-user', 'tool-todo', 'tool-web']) {
    assert.match(agent, new RegExp(`id:\\s*${tool}`))
  }
})
