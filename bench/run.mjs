#!/usr/bin/env node
/**
 * bench/run.mjs — measurable effect check for dsh-compact-standard (v0.2.0)
 *
 * Aggregates runtime metrics from persisted DSH session logs
 * (concatenated zstd frames of JSONL). This is the measurement half of
 * docs/BENCHMARK.md; results are only comparable between arms that share the
 * same provider/model/reasoningEffort (see the "confounds" note in that doc).
 *
 * Usage:
 *   node bench/run.mjs [<session-dir>]        # table of all sessions found
 *   node bench/run.mjs <session.jsonl.zstd>... # explicit files
 *   node bench/run.mjs <dir> --json            # machine-readable output
 *
 * Node >= 22.2 (node:zlib zstd) on Windows or POSIX.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

const ZSTD_MAGIC = 4247762216 // 0xFD2FB528 little-endian

export function scanZstdFrames(buffer) {
  const frames = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) break
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) break
    offset += 4
    if (offset === buffer.length) break
    const d = buffer.readUInt8(offset)
    offset += 1
    if ((d & 24) !== 0) break
    const csf = d >>> 6
    const single = (d & 32) !== 0
    const checksum = (d & 4) !== 0
    const dictFlag = d & 3
    const dictBytes = dictFlag === 3 ? 4 : dictFlag
    const sizeBytes = csf === 0 ? (single ? 1 : 0) : 1 << csf
    const rem = (single ? 0 : 1) + dictBytes + sizeBytes
    if (buffer.length - offset < rem) break
    offset += rem
    for (;;) {
      if (buffer.length - offset < 3) break
      const bh = buffer.readUIntLE(offset, 3)
      offset += 3
      const last = (bh & 1) !== 0
      const type = (bh >>> 1) & 3
      const size = bh >>> 3
      if (type === 3) break
      const payload = type === 1 ? 1 : size
      if (buffer.length - offset < payload) break
      offset += payload
      if (last) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) break
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return frames
}

export function decodeSession(input) {
  const parts = []
  for (const f of scanZstdFrames(input)) {
    try {
      parts.push(zstdDecompressSync(input.subarray(f.start, f.end)))
    } catch {
      /* skip corrupt frame */
    }
  }
  return Buffer.concat(parts).toString('utf8')
}

export function loadRecords(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function aggregate(records) {
  const header = records.find((r) => r.type === 'session')
  const h0 = records.find((r) => r.type === 'request/header')
  const sys = h0?.data?.header?.system ?? h0?.header?.system ?? ''
  const toolsFirst = (h0?.data?.header?.tools ?? h0?.header?.tools ?? []).map((t) => t.name)
  const model = new Set()
  for (const r of records) {
    if (r.type === 'request/header') {
      const h = r.data?.header ?? r.header
      if (h?.config?.model) model.add(h.config.model)
    }
  }
  const msgs = records.filter((r) => r.type === 'assistant/message' && (r.usage ?? r.data?.usage))
  const usageOf = (m) => m.usage ?? m.data?.usage
  const sum = (f) => msgs.reduce((s, m) => s + (usageOf(m)[f] ?? 0), 0)
  const avg = (f) => (msgs.length ? Math.round(sum(f) / msgs.length) : 0)
  const finals = msgs.filter((m) => {
    const c = m.data?.message?.content ?? m.message?.content ?? []
    return c.some((b) => b.type === 'text' || b.type === 'chat') && !c.some((b) => b.type === 'tool-call')
  })
  const finOut = finals.length ? Math.round(finals.reduce((s, m) => s + usageOf(m).outputTokens, 0) / finals.length) : 0

  const starts = new Map()
  const ttfb = []
  for (const r of records) {
    if (r.type === 'step/start') starts.set(`${r.data?.turn}:${r.data?.step}`, r.time)
    if (r.type === 'assistant/chunk' && r.data?.chunk?.type === 'block-start') {
      const k = `${r.data?.turn}:${r.data?.step}`
      const s = starts.get(k)
      if (s !== undefined) ttfb.push(r.time - s)
    }
  }
  ttfb.sort((a, b) => a - b)
  const median = ttfb.length ? ttfb[Math.floor(ttfb.length / 2)] : 0

  return {
    session: header?.id ?? '?',
    created: new Date(header?.createdAt ?? 0).toISOString().slice(0, 16),
    preset: header?.agentPreset ?? '?',
    model: [...model].join(','),
    systemChars: sys.length,
    toolsFirst: toolsFirst.join('+') || '-',
    steps: msgs.length,
    avgIn: avg('inputTokens'),
    avgOut: avg('outputTokens'),
    avgReason: avg('reasoningTokens'),
    cacheRead: sum('cacheReadTokens'),
    finals: finals.length,
    avgFinalOut: finOut,
    medianTtfbMs: median,
  }
}

function findSessionFiles(target) {
  if (!target) target = join(process.env.DSH_HOME || '', 'sessions')
  const stat = statSync(target)
  if (stat.isFile()) return [target]
  const out = []
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name === 'session.jsonl.zstd') out.push(p)
    }
  }
  walk(target)
  return out
}

function main() {
  const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const json = process.argv.includes('--json')
  const files = targets.length ? targets.flatMap(findSessionFiles) : findSessionFiles()
  const rows = files.map((f) => aggregate(loadRecords(decodeSession(readFileSync(f)))))

  if (json) {
    console.log(JSON.stringify(rows, null, 2))
    return
  }
  const cols = ['session', 'created', 'preset', 'model', 'systemChars', 'toolsFirst', 'steps', 'avgIn', 'avgOut', 'avgReason', 'cacheRead', 'finals', 'avgFinalOut', 'medianTtfbMs']
  console.log(cols.join(' | '))
  for (const r of rows) console.log(cols.map((c) => r[c] ?? '').join(' | '))
}

main()