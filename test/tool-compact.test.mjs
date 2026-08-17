import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, compressToolSchema, compressTools, measureTools, name } from '../preset/tool-compact.mjs'

/** Minimal realistic tool catalog mirroring the shape of assembled tools. */
const fixtures = [
  {
    name: 'pwsh',
    description: 'Execute a PowerShell command. Long original description with rules that must survive.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The PowerShell command to execute.' },
        workdir: { type: 'string', description: 'Working directory; defaults to the session workspace.' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read',
    description: 'Read a UTF-8 text file and return line-numbered content.',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to read (filesystem backend).' },
        offset: { type: 'number', description: '1-based first line to return; defaults to 1.' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'unlisted_tool',
    description: 'A tool with no curated entry; must pass through byte-identical.',
    parameters: { type: 'object', properties: { x: { type: 'string', description: 'stays' } }, required: ['x'] },
  },
]

test('exports a diagnostic plugin name', () => {
  assert.equal(name, 'compact-tool-descriptions')
})

test('tool-level description is replaced when curated', () => {
  const out = compressToolSchema(fixtures[0])
  assert.match(out.description, /Execute a PowerShell command/)
  assert.notEqual(out.description, fixtures[0].description)
})

test('parameter descriptions are replaced along dot paths', () => {
  const out = compressToolSchema(fixtures[0])
  assert.equal(out.parameters.properties.command.description, 'The PowerShell command to execute.')
  assert.equal(out.parameters.properties.workdir.description, 'Working directory; defaults to the session workspace.')
})

test('structural schema keys are never touched', () => {
  const out = compressToolSchema(fixtures[0])
  assert.equal(out.parameters.type, 'object')
  assert.deepEqual(out.parameters.required, ['command'])
  assert.deepEqual(Object.keys(out.parameters.properties), ['command', 'workdir'])
})

test('unlisted tools pass through byte-identical (same reference)', () => {
  const out = compressTools(fixtures)
  assert.equal(out[2], fixtures[2])
})

test('compression is a pure projection: input is never mutated', () => {
  const before = JSON.stringify(fixtures)
  compressTools(fixtures)
  assert.equal(JSON.stringify(fixtures), before)
})

test('measureTools reports the real-catalog compression (regression: >= 15% / >= 4000 chars)', async () => {
  const fs = await import('node:fs')
  const schemas = JSON.parse(fs.readFileSync(new URL('../test/fixtures/tools-25.json', import.meta.url), 'utf8'))
  const m = measureTools(schemas)
  assert.equal(m.before, m.after + m.saved)
  assert.ok(m.saved >= 4000, `expected >= 4000 saved chars, got ${m.saved}`)
  assert.ok(m.ratio >= 0.15, `expected ratio >= 0.15, got ${m.ratio.toFixed(3)}`)
})

test('filter degrades to the unchanged catalog on missing tools array', async () => {
  let listener
  const ctx = {
    on(event, callback) {
      listener = callback
    },
    logger: { warn() {} },
  }
  apply(ctx, {})
  const assembled = await listener(undefined, undefined, async () => ({ system: 's', tools: undefined }))
  assert.deepEqual(assembled.tools, undefined)
})

test('filter passes the compressed catalog through', async () => {
  let listener
  const ctx = {
    on(event, callback) {
      listener = callback
    },
    logger: { warn() {} },
  }
  apply(ctx, {})
  const assembled = await listener(undefined, undefined, async () => ({ system: 's', tools: fixtures }))
  assert.equal(assembled.tools.length, fixtures.length)
  assert.equal(assembled.tools[0].name, 'pwsh')
})

test('disabled config leaves the catalog untouched', async () => {
  let listener
  const ctx = {
    on(event, callback) {
      listener = callback
    },
    logger: { warn() {} },
  }
  apply(ctx, { disabled: true })
  const assembled = await listener(undefined, undefined, async () => ({ system: 's', tools: fixtures }))
  assert.equal(assembled.tools, fixtures)
})

test('every curated description keeps the key normative fragments of the original (no capability loss)', async () => {
  const fs = await import('node:fs')
  const schemas = JSON.parse(fs.readFileSync(new URL('../test/fixtures/tools-25.json', import.meta.url), 'utf8'))
  const original = new Map(schemas.map((t) => [t.name, t]))
  for (const t of schemas) {
    const out = compressToolSchema(t)
    assert.equal(out.name, t.name, `name preserved for ${t.name}`)
    const check = (a, b) => {
      if (typeof a === 'object' && a !== null) {
        for (const key of Object.keys(a)) {
          if (key === 'description') continue
          check(a[key], b[key])
        }
      } else if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') {
        assert.equal(a, b, `non-description value drift at ${t.name}`)
      }
    }
    check(original.get(t.name), out)
  }
})