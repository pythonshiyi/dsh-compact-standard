#!/usr/bin/env node
/**
 * dsh-compact-standard host tuning installer (v0.2.0)
 *
 * Applies the user-level knobs that actually cut tokens, with backup and
 * rollback. It touches only `~/.dsh/settings.yaml` (or $DSH_HOME/settings.yaml);
 * the agent preset itself is installed separately (see README).
 *
 * The identity-opener knob (includeHarnessIdentity) is NOT touchable here:
 * on stock installs that text lives inside the compiled DSH app and no
 * user-level setting exists. This script tunes what IS user-owned:
 *
 *   1. agent-default-model.reasoningEffort  (deepseek-official route only;
 *      on the opencode-go route observed reasoning tokens are already 0)
 *   2. agent-presets.default                (select this preset)
 *
 * Usage:
 *   node scripts/install.mjs tune [--reasoning off|low|medium|high|max]
 *                                  [--preset compact-standard] [--apply]
 *   node scripts/install.mjs verify
 *   node scripts/install.mjs rollback
 *
 * Safety:
 *   - default is DRY-RUN: prints the exact change without writing
 *   - --apply writes after backing up settings.yaml to
 *     settings.yaml.bak-<timestamp>; rollback restores the latest backup
 *   - line-scoped regex edits plus a structural YAML re-parse when js-yaml is
 *     importable (falls back to a syntax sanity pass otherwise)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const SETTINGS = join(DSH_HOME, 'settings.yaml')
const REASONING_LEVELS = new Set(['off', 'low', 'medium', 'high', 'max'])
const VALID_PRESET = /^[a-z0-9][a-z0-9._-]*$/

const args = process.argv.slice(2)
const action = args[0] ?? 'tune'
const opts = { reasoning: null, preset: null, apply: false }
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--apply') opts.apply = true
  else if (args[i] === '--reasoning') opts.reasoning = args[++i]
  else if (args[i] === '--preset') opts.preset = args[++i]
}

function fail(message) {
  console.error(`install: ${message}`)
  process.exit(1)
}

function backups() {
  if (!existsSync(SETTINGS)) return []
  return readdirSync(dirname(SETTINGS))
    .filter((f) => /^settings\.yaml\.bak-\d{8}T\d{6}$/.test(f))
    .map((f) => join(dirname(SETTINGS), f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

function patchSetting(text, key, value) {
  const lines = text.split('\n')
  let changed = false
  const rx = new RegExp(`^([ \\t]*)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(rx)
    if (m) {
      lines[i] = `${m[1]}${key}: ${value}`
      changed = true
    }
  }
  return { text: lines.join('\n'), changed }
}

async function reparse(text) {
  try {
    const require = createRequire(fileURLToPath(import.meta.url))
    const yaml = require('js-yaml')
    yaml.load(text)
    return 'yaml'
  } catch {
    const anyBad = text
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .some((l) => !l.includes(':'))
    return anyBad ? null : 'shallow'
  }
}

function currentConfig() {
  if (!existsSync(SETTINGS)) return null
  const text = readFileSync(SETTINGS, 'utf8')
  const cfg = { reasoning: null, preset: null, file: SETTINGS }
  for (const line of text.split('\n')) {
    let m = line.match(/^\s*reasoningEffort:\s*(\S+)/)
    if (m) cfg.reasoning = m[1]
    m = line.match(/^\s*default:\s*(\S+)/)
    if (m) cfg.preset = m[1]
  }
  return cfg
}

async function main() {
  if (action === 'verify') {
    const cfg = currentConfig()
    console.log('settings file:', cfg ? cfg.file : 'NOT FOUND')
    console.log('agent-presets.default:', cfg?.preset ?? 'n/a')
    console.log('agent-default-model.reasoningEffort:', cfg?.reasoning ?? 'n/a')
    console.log('backups:', backups().length)
    return
  }

  if (action === 'rollback') {
    const list = backups()
    if (list.length === 0) fail('no backup found')
    if (!opts.apply) {
      console.log('DRY-RUN rollback target:', list[0])
      console.log('re-run with --apply to restore it')
      return
    }
    copyFileSync(list[0], SETTINGS)
    console.log('restored', list[0], '->', SETTINGS)
    return
  }

  if (action !== 'tune') fail(`unknown action "${action}"`)

  const edits = []
  if (opts.reasoning !== null) {
    if (!REASONING_LEVELS.has(opts.reasoning)) fail(`--reasoning must be one of ${[...REASONING_LEVELS].join('/')}`)
    edits.push(['reasoningEffort', opts.reasoning])
  }
  if (opts.preset !== null) {
    if (!VALID_PRESET.test(opts.preset)) fail(`--preset name invalid: ${opts.preset}`)
    edits.push(['default', opts.preset])
  }
  if (edits.length === 0) {
    console.log('nothing to do; pass --reasoning <level> and/or --preset <name>')
    return
  }

  const before = currentConfig()
  if (!before) fail(`settings.yaml not found at ${SETTINGS}`)
  let text = readFileSync(SETTINGS, 'utf8')
  let changed = false
  for (const [key, value] of edits) {
    const r = patchSetting(text, key, value)
    if (r.changed) changed = true
    text = r.text
  }
  if (!changed) {
    console.log('no matching keys found; expected lines like "  reasoningEffort: max" under agent-default-model')
    return
  }
  const check = await reparse(text)
  if (!check) fail('patched settings.yaml fails structural sanity; nothing written')

  console.log('current:', JSON.stringify(before))
  console.log('target :', JSON.stringify(Object.fromEntries(edits)))
  if (!opts.apply) {
    console.log('DRY-RUN: no file written. Re-run with --apply to commit.')
    console.log('note: reasoningEffort matters on the deepseek-official route;')
    console.log('      opencode-go already returns reasoningTokens=0 (measured).')
    return
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '')
  const bak = `${SETTINGS}.bak-${stamp}`
  copyFileSync(SETTINGS, bak)
  writeFileSync(SETTINGS, text)
  console.log('backup :', bak)
  console.log('written:', SETTINGS)
  console.log('restart DeepSeek Harness for new sessions to pick it up.')
}

main()