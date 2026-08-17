#!/usr/bin/env node
/**
 * scripts/measure-tools.mjs (v0.3.0) — reproduce the tool-compact numbers.
 *
 * Runs the compression projection over the checked-in real 25-tool catalog
 * fixture and prints the per-tool and aggregate character accounting. The
 * aggregate (26,638 → 21,963, −17.6% on the author host's rc.6 catalog) is
 * the number cited in README/EXPERIMENT/BENCHMARK; run it after upgrading
 * DSH to see whether your catalog drifted.
 *
 * Usage: node scripts/measure-tools.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { compressTools, measureTools } from '../preset/tool-compact.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = JSON.parse(readFileSync(join(root, 'test', 'fixtures', 'tools-25.json'), 'utf8'))

const m = measureTools(fixture)
console.log(`catalog: ${fixture.length} tools`)
console.log(`before: ${m.before} chars`)
console.log(`after:  ${m.after} chars`)
console.log(`saved:  ${m.saved} chars (${(m.ratio * 100).toFixed(1)}%)`)

const rows = fixture
  .map((t) => {
    const [c] = compressTools([t])
    return { name: t.name, before: JSON.stringify(t).length, after: JSON.stringify(c).length }
  })
  .sort((a, b) => b.before - a.before)
console.log()
for (const r of rows) {
  console.log(`${r.name.padEnd(24)} ${String(r.before).padStart(6)} -> ${String(r.after).padStart(6)}`)
}