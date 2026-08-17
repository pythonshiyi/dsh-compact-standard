import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, name } from '../preset/tool-bootstrap.mjs'

const config = {
  commonTools: ['read'],
  shellTools: ['bash', 'pwsh'],
}

function register(cfg = config) {
  let listener
  const warns = []
  const ctx = {
    on(event, callback) {
      assert.equal(event, 'system-prompt/assemble')
      listener = callback
    },
    logger: {
      warn(message) {
        warns.push(message)
      },
    },
  }
  apply(ctx, cfg)
  assert.equal(typeof listener, 'function')
  return { listener, warns }
}

function assemble(listener, events, tools, id = 's') {
  return listener(
    undefined,
    { agent: { session: { id, events } } },
    async () => ({ system: 'minimal persona', tools }),
  )
}

test('exports a diagnostic plugin name', () => {
  assert.equal(name, 'anchored-tool-bootstrap')
})

test('first request exposes one platform shell and read', async () => {
  const { listener } = register()
  const tools = [{ name: 'pwsh' }, { name: 'read' }, { name: 'edit' }]
  const result = await assemble(listener, [], tools)
  assert.deepEqual(result.tools.map((tool) => tool.name), ['pwsh', 'read'])
})

test('a durable tool call promotes the complete catalog', async () => {
  const { listener } = register()
  const tools = [{ name: 'pwsh' }, { name: 'read' }, { name: 'edit' }, { name: 'grep' }]
  const result = await assemble(listener, [{ type: 'tool/call', data: { name: 'read' } }], tools)
  assert.deepEqual(result.tools, tools)
})

test('a first assistant message promotes the complete catalog (no tool call needed)', async () => {
  const { listener } = register()
  const tools = [{ name: 'pwsh' }, { name: 'read' }, { name: 'write' }]
  const result = await assemble(listener, [{ type: 'assistant/message', data: {} }], tools)
  assert.deepEqual(result.tools, tools)
})

test('sessions derive promotion independently from their own events', async () => {
  const { listener } = register()
  const tools = [{ name: 'bash' }, { name: 'read' }, { name: 'write' }]
  const promoted = await assemble(listener, [{ type: 'tool/call' }], tools, 'a')
  const fresh = await assemble(listener, [], tools, 'b')
  assert.deepEqual(promoted.tools, tools)
  assert.deepEqual(fresh.tools.map((tool) => tool.name), ['bash', 'read'])
})

test('promotion is memoized per session id within one process', async () => {
  const { listener } = register()
  const tools = [{ name: 'bash' }, { name: 'read' }, { name: 'write' }]
  const first = await assemble(listener, [{ type: 'tool/call' }], tools, 'memo')
  assert.deepEqual(first.tools, tools)
  // Same session id, events now empty: the cached decision still promotes.
  const second = await assemble(listener, [], tools, 'memo')
  assert.deepEqual(second.tools, tools)
})

test('promoteOn tool-call requires a tool call, not just a reply', async () => {
  const { listener } = register({ ...config, promoteOn: 'tool-call' })
  const tools = [{ name: 'bash' }, { name: 'read' }, { name: 'write' }]
  const replyOnly = await assemble(listener, [{ type: 'assistant/message' }], tools, 'a')
  assert.deepEqual(replyOnly.tools.map((tool) => tool.name), ['bash', 'read'])
  const withCall = await assemble(listener, [{ type: 'tool/call' }], tools, 'b')
  assert.deepEqual(withCall.tools, tools)
})

test('promoteOn assistant-message promotes after any first reply', async () => {
  const { listener } = register({ ...config, promoteOn: 'assistant-message' })
  const tools = [{ name: 'bash' }, { name: 'read' }, { name: 'write' }]
  const result = await assemble(listener, [{ type: 'assistant/message' }], tools, 'a')
  assert.deepEqual(result.tools, tools)
})

test('a missing bootstrap shell degrades gracefully to the full catalog', async () => {
  const { listener, warns } = register()
  const tools = [{ name: 'read' }, { name: 'edit' }]
  const result = await assemble(listener, [], tools)
  assert.deepEqual(result.tools, tools)
  assert.ok(warns.length >= 1)
})

test('invalid promoteOn values fail at apply time', () => {
  assert.throws(() => register({ ...config, promoteOn: 'bogus' }), /promoteOn/)
})
