/**
 * compact-tool-descriptions (v0.3.0) — the deterministic token lever.
 *
 * Rewrites the MODEL-FACING projection of the tool catalog at assembly time:
 * every tool-level and parameter-level `description` that has a curated
 * replacement is densified; structural JSON-Schema keys are NEVER touched
 * (type/properties/required/items/enum/const/additionalProperties/default),
 * unmatched tools and unmatched parameters pass through byte-identical, and a
 * runtime failure degrades to the unmodified catalog. Execution is untouched:
 * the registry executes from its own definitions; this filter only changes
 * the string the model sees (exactly like tool-bootstrap narrows the list).
 *
 * Capability contract (why compression is not capability loss):
 *  - Every normative sentence of the originals is retained in substance:
 *    sandbox/approval rules, EPERM and escalation policy, goal/plan rules,
 *    workflow constraints, subagent semantics, tool semantics. Only
 *    connective polish, restatements, and examples are removed.
 *  - Parameter schema structure (types, enum, requireds) is invariant, so the
 *    runtime accepts exactly the same calls.
 *  - Measured on the author host: 25 real tool schemas, 26,638 chars →
 *    ~17,8xx chars (~33%, see docs/BENCHMARK.md and npm run bench).
 *
 * Matched keys are addressed by the tool name for the tool description and by
 * a dot path of schema property names (without the root) for parameters, e.g.
 * `questions.items.properties.options.items.properties.label`. A path that no
 * longer exists in the current schema is silently ignored, so upstream schema
 * drift degrades gracefully instead of crashing.
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'compact-tool-descriptions'

/** Prompt assembly must exist before this filter can register. */
export const inject = ['systemPrompt']

/**
 * Curated replacements: tool name → { description?, params? } where params
 * maps a dot path of property names to the densified description string.
 * Only keys present here are rewritten; everything else stays untouched.
 */
const COMPRESS = {
  ask_user_question: {
    description: 'Ask the user a concise question to get confirmation, a choice, or missing info before proceeding. Send one or more questions, each with a stable id echoed in the answer.',
    params: {
      'questions': 'The questions to ask.',
      'questions.items.properties.id': 'Stable id; echoed in the answer.',
      'questions.items.properties.question': 'The question text.',
      'questions.items.properties.header': 'Optional short heading (e.g. "Confirm").',
      'questions.items.properties.options.items.properties.label': 'Short user-facing option label.',
      'questions.items.properties.options.items.properties.description': 'One sentence on the tradeoff.',
      'questions.items.properties.multi_select': 'Allow multiple selections. Default false.',
    },
  },

  create_goal: {
    description: 'Create one persisted same-session completion goal when the current direct human request is a long-running objective that should continue across autonomous goal rounds; infer this intent without the user saying "create a goal". Not for trivial single-turn work. Execution rejects non-human and subagent authority.',
    params: {
      'objective': 'The concrete completion objective inferred from the direct human request.',
      'max_goal_rounds': 'Optional positive safe-integer limit on automatic continuation rounds.',
    },
  },

  edit: {
    description: 'Replace literal text in an existing UTF-8 text file.',
    params: {
      'file_path': 'Path to edit (filesystem backend).',
      'old_string': 'Literal text to replace; must match exactly.',
      'new_string': 'Literal replacement; empty string deletes the match.',
      'replace_all': 'Replace all matches. Default false; when false old_string must appear exactly once.',
      'sandbox_permissions': 'Wider sandbox mode; only as a one-shot retry of a file operation the sandbox just denied; requires justification and user approval.',
      'justification': 'One sentence explaining why this file operation needs wider access (required with sandbox_permissions).',
    },
  },

  exit_plan_mode: {
    description: 'Use only in plan mode: present your plan for review and, on approval, leave plan mode. Send the COMPLETE plan as markdown starting with a # heading. On rejection, revise and present again.',
    params: {
      'plan': 'The complete plan as markdown, starting with a # heading.',
    },
  },

  get_goal: {
    description: 'Read the current same-session goal: exact id/revision, objective, phase, completed rounds, round limit, blocker reason, and whether another continuation is armed. Call before updating a goal.',
  },

  glob: {
    description: 'Find files whose paths match a glob pattern; returns file paths only, never directories, including hidden and ignored files (VCS metadata excluded). Up to 100 paths in modification-time order; a larger result returns the first 100 and reports where the complete sorted list was saved. Does not enumerate directory entries.',
    params: {
      'pattern': 'Glob pattern (e.g. "**/*.ts"). A pattern with no "/" matches basenames at any depth; include a separator to anchor the depth.',
      'path': 'Directory to search in; defaults to the session workspace.',
    },
  },

  grep: {
    description: 'Search file contents with a ripgrep regular expression; returns matching lines with line numbers, grouped by file. First 250 matches inline; a capped result reports where the complete match list was saved. Use read on a matched file for surrounding context.',
    params: {
      'pattern': 'Regular expression to search for (ripgrep syntax).',
      'path': 'File or directory to search; default: session workspace.',
      'include': 'One glob filter for which files to search (e.g. "*.ts"); not a list; negation not supported.',
    },
  },

  interrupt_agent: {
    description: 'Request cancellation of a background agent\'s current turn by agent id (direct child or deeper descendant). Only the current turn stops: queued messages stay parked until a later send_message, agents it started keep running, and the agent stays available for follow-ups. Returns as soon as the stop request is accepted, so the target may keep running briefly; interrupting a finished agent is a no-op.',
    params: {
      'agent_id': 'The agent id of the running agent to interrupt.',
    },
  },

  job_kill: {
    description: 'Request cancellation of a running background job by job id; the job settles as killed once its work actually stops.',
    params: {
      'job_id': 'Job id returned by the tool that started the background work.',
      'reason': 'Optional short reason, recorded in the log and forwarded to the job.',
    },
  },

  job_list: {
    description: 'List your background jobs (running and finished) with ids, kinds, and statuses.',
  },

  job_output: {
    description: 'Read a background job. Stream jobs return only output since the previous read; final-output jobs return their result after settlement. Every response ends with [status: ...]; reads are non-blocking unless wait: true, which waits up to the configured cap.',
    params: {
      'job_id': 'Job id returned by the tool that started the background work.',
      'wait': 'Block until terminal status or timeout; a timed-out wait returns [status: running] and leaves the job alive.',
      'timeout_ms': 'Max wait in ms (only meaningful with wait: true); defaults to configured wait timeout, capped by maximum.',
    },
  },

  list_agents: {
    description: 'List your continuable background subagents by durable id and label: recall which you started, not to poll for completion — you are told when one finishes. running = working now; idle = loaded between turns; ready = stored, resumable, not terminal — send_message starts a new turn. Scope descendants walks the whole tree in stable pre-order.',
    params: {
      'scope': 'children (default): direct children only; descendants: the complete tree below you.',
    },
  },

  pwsh: {
    description: 'Execute a PowerShell command (pwsh -Command); returns stdout/stderr. Each call is a FRESH process: no cwd/var/function state persists — pass workdir instead of cd. Native Windows paths (C:\\...); env via $env:NAME; harness facts via $env:DSH_*. Non-zero exit → [exit code: N]. A file-sandbox denial reports [sandbox: file access denied under <mode> mode] — policy denial, not a bug: do not retry another way; escalate the exact command once (rules below). Long output truncates to its tail; full output is saved and its path reported. A force-killed Windows command settles as [exit code: 1] with no signal marker — an interruption, not a failure. Long-running: set run_in_background: true → returns job id; collect via job_output, stop via job_kill; no timeout. Read-only sandbox = ConstrainedLanguage: cmdlets + core types ([string] [datetime] [regex] [guid]) only; .NET static calls, Add-Type, COM, reflection fail with "only core types"; workspace-write stays FullLanguage unless host policy says otherwise. Both confined modes block named pipes: capturing output via piped stdio (child_process.spawn/exec, default stdio: pipe) fails with EPERM; stdio inherit/ignore works — EPERM is the documented boundary, do not retry another way. Escalation: run the command, read the marker; on denial retry the EXACT same command once with sandbox_permissions (narrowest sufficient wider mode) + one-sentence justification; the approval prompt is the user\'s consent. Approval prompts disabled → denial is final, never set sandbox_permissions. Never escalate speculatively — ground it in a real denial (or one this session already denied). A rejected escalation is final for that command: stop and explain, never work around.',
    params: {
      'command': 'The PowerShell command to execute.',
      'description': 'Active-voice description of what the command does, 5-10 words (shown in the UI).',
      'timeoutMs': 'Timeout ms; executor applies configured default/cap and kills the command on expiry.',
      'workdir': 'Working directory; defaults to the session workspace.',
      'run_in_background': 'Run in background, return job id immediately; collect with job_output, stop with job_kill. No timeout applies.',
      'sandbox_permissions': 'Narrowest wider sandbox mode (workspace-write | danger-full-access); valid only as a one-shot retry of a command the sandbox just denied; requires justification and user approval.',
      'justification': 'One sentence explaining why this exact command needs the wider access (required with sandbox_permissions).',
    },
  },

  ralph: {
    description: 'Run a foreground fresh-agent Ralph loop toward one immutable objective. Use only when the direct human explicitly asks for Ralph or fresh-agent iteration. Each round opens a new child with no parent conversation or prior child session; the shared workspace is durable memory, and only a bounded structured report crosses rounds. Returns when a worker reports completion or a concrete blocker, or at the round limit. Ordinary long-running same-session work belongs to goal tools.',
    params: {
      'objective': 'The immutable completion objective for every fresh Ralph round.',
      'maxRounds': 'Optional positive safe-integer round cap, bounded by the deployment ceiling.',
    },
  },

  read: {
    description: 'Read a UTF-8 text file and return line-numbered content.',
    params: {
      'file_path': 'Path to read (filesystem backend).',
      'offset': '1-based first line to return; defaults to 1.',
      'limit': 'Maximum number of lines to return; defaults to 2000.',
    },
  },

  read_image: {
    description: 'Read a PNG/JPEG/WebP/GIF file and return the image itself. Requires the current model to accept image input.',
    params: {
      'file_path': 'Path to the image file (filesystem backend).',
    },
  },

  send_message: {
    description: 'Send a message to a background subagent by its durable subagent id, continuing the same conversation. It becomes the subagent\'s next turn: if still working, the message waits until the current turn finishes, so it cannot redirect work already underway. Returns no answer — only delivery confirmation — so use it to give more work. A failure means the message was NOT delivered.',
    params: {
      'subagent_id': 'The subagent id returned when the background subagent was started.',
      'message': 'The message to deliver to the subagent.',
    },
  },

  skill: {
    description: 'Load the full instructions for an available skill. Call with the exact skill name from the session skill catalog before acting on a task that names or clearly matches that skill.',
    params: {
      'name': 'The exact skill name from the available skills list.',
    },
  },

  subagent: {
    description: 'Delegate a self-contained task to a subagent (a separate agent in its own context) to offload focused, independent work — research, a scoped implementation, an analysis — so it does not consume this conversation\'s context. The subagent returns its result, not its intermediate steps. Give a complete, standalone prompt: it does not see this conversation. Runs in the background by default, immediately returns a durable subagent id, and keeps the child conversation for later turns; when it settles you receive a notice. send_message starts a later turn in the same child conversation. Set run_in_background: false only when your next action depends on the result.',
    params: {
      'description': 'A short (3-5 word) description of the delegated task, for display.',
      'prompt': 'The complete, self-contained task for the subagent; it does not share this conversation\'s context, so include everything it needs.',
      'run_in_background': 'Whether to run in the background and return a durable subagent id immediately; defaults to true. Set false to wait for the result when your next action depends on it.',
    },
  },

  subagent_fork: {
    description: 'Delegate a task to a subagent that inherits this conversation: a child seeded with all completed turns so far (not the current in-flight turn). Use when the subtask builds on this conversation\'s context — a follow-up analysis, review, or continuation — without consuming this conversation\'s context for the work itself. You receive its result, not its intermediate steps. Runs in the background by default, immediately returns a durable subagent id, and keeps the child conversation for later turns; send_message starts a later turn in the same child conversation.',
    params: {
      'description': 'A short (3-5 word) description of the delegated task, for display.',
      'prompt': 'The task for the subagent; it already sees this conversation\'s completed turns, so build on them freely and state only what is new.',
      'run_in_background': 'Whether to run in the background and return a durable subagent id immediately; defaults to true.',
    },
  },

  todo_write: {
    description: 'Record and update a structured task list for the current work. Send the ENTIRE list every call — it REPLACES the previous list (no partial updates). Add one todo per concrete step before you start. Mark every todo being actively worked on in_progress (several at once when work runs in parallel; one for sequential work); while work remains at least one task stays in_progress. Mark completed the moment it is done; allow no in_progress item once all work is complete. Skip the list for trivial single-step tasks. Statuses: pending | in_progress | completed.',
    params: {
      'todos': 'The COMPLETE task list, replacing any previous list.',
    },
  },

  update_goal: {
    description: 'Update the exact current goal revision. edit, pause, and resume require a direct top-level human request. During an automatic continuation of the current goal, complete and blocked are also allowed. blocked is rejected before the configured minimum round count; you must judge that the same condition persisted across those rounds and explain it in blocked_reason.',
    params: {
      'goal_id': 'Exact id returned by get_goal.',
      'revision': 'Exact positive revision returned by get_goal.',
      'action': 'edit | pause | resume | complete | blocked.',
      'objective': 'Replacement objective; valid only with action edit.',
      'max_goal_rounds': 'Replacement cap; valid only with action edit.',
      'blocked_reason': 'Concrete blocking condition; required only with action blocked.',
    },
  },

  web_search: {
    description: 'Search the web for current information; returns an optional summary answer and a list of source URLs.',
    params: {
      'query': 'The search query.',
    },
  },

  workflow: {
    description: 'Run a JavaScript workflow script that orchestrates subagents at scale — e.g. an audit over many files, a migration, multi-angle research, adversarial verification — instead of delegating turn by turn. meta (JSON): required name (short kebab-case) + description; optional whenToUse, phases ([{title, detail?, provider?, model?}]). script = plain JavaScript body ONLY (NOT TypeScript; NO `export const meta` — meta is a parameter, not code); top-level await allowed; end with return <value> (JSON-serializable; the tool\'s result). Hooks: agent(prompt, opts?) runs one subagent to completion; without opts.schema resolves the child\'s final text, with opts.schema (object-rooted JSON Schema using ONLY type/properties/required/additionalProperties/items/enum/const/oneOf; no pattern/format/numeric bounds) resolves the validated object; resolves null when the child fails (filter with .filter(Boolean)); other opts: label (display), phase (progress group), and provider/model target overrides (either alone); anything else (effort/isolation/agentType) is rejected loudly. pipeline(items, ...stages) processes each item through every stage independently with NO barrier; each stage gets (prev, item, index); an ordinary stage throw drops that item to null and skips its remaining stages. parallel(thunks) runs zero-argument functions concurrently and awaits ALL (a barrier; use only when a stage genuinely needs every prior result together); a throwing thunk resolves to null. phase(title) starts a progress phase; log(message) narrates progress; args = the tool call\'s args input, verbatim. Misused hooks (bad arguments, unknown options, unsupported schemas, tripped caps) throw errors that ALWAYS kill the script — never dissolve into per-item null. Constraints: concurrency and total-agent caps apply; no filesystem, network, timers, or Node.js APIs — the agents do the work, the script only coordinates. The run executes in the foreground: this call returns when the whole script finishes.',
    params: {
      'script': 'The plain-JS workflow script body (top-level await allowed; NO export const meta; end with return <json-value>).',
      'meta': 'The workflow identity block (plain JSON — never code).',
      'meta.properties.name': 'Short kebab-case workflow name.',
      'meta.properties.description': 'One-line description of what the workflow does.',
      'meta.properties.whenToUse': 'Optional guidance on when this workflow applies.',
      'meta.properties.phases': 'Optional phase declarations matched by phase() calls.',
      'meta.properties.phases.items.properties.title': 'The phase title phase() calls match by exact string.',
      'args': 'Optional JSON input exposed to the script as the args global (wrap a bare list as a field, e.g. {"files": [...]}).',
    },
  },

  write: {
    description: 'Create or fully replace a UTF-8 text file.',
    params: {
      'file_path': 'Path to write (filesystem backend).',
      'content': 'Full UTF-8 text content to write.',
      'sandbox_permissions': 'Wider sandbox mode; only as a one-shot retry of a file operation the sandbox just denied; requires justification and user approval.',
      'justification': 'One sentence explaining why this file operation needs wider access (required with sandbox_permissions).',
    },
  },
}

/** Apply one matched description override onto a schema node's `description`, if present. */
function applyOverride(node, replacement) {
  if (node && typeof node === 'object' && Object.hasOwn(node, 'description')) {
    node.description = replacement
  }
}

/**
 * Rewrite descriptions on a single tool schema (pure: never mutates input).
 * Structural keys are never touched. Dotted `path` addresses walk the
 * parameters schema by property names, e.g. "questions.items.properties.id".
 */
export function compressToolSchema(tool) {
  const spec = COMPRESS[tool.name]
  if (!spec) return tool
  const out = { ...tool }
  if (spec.description !== undefined && typeof out.description === 'string') {
    out.description = spec.description
  }
  if (spec.params && out.parameters && typeof out.parameters === 'object') {
    // Deep-copy so the original tool (and any shared reference) is never
    // mutated; rewriting must be a pure projection.
    out.parameters = JSON.parse(JSON.stringify(out.parameters))
    for (const [path, text] of Object.entries(spec.params)) {
      let node = out.parameters.properties
      let ok = true
      for (const seg of path.split('.')) {
        if (node && typeof node === 'object' && Object.hasOwn(node, seg)) node = node[seg]
        else {
          ok = false
          break
        }
      }
      if (ok) applyOverride(node, text)
    }
  }
  return out
}

/** Rewrite the whole assembled catalog; unmatched tools pass through. */
export function compressTools(tools) {
  return tools.map((tool) => compressToolSchema(tool))
}

/** Character accounting for verification (`npm run bench` / tests / docs). */
export function measureTools(tools) {
  const plain = (t) => JSON.stringify(t)
  const before = tools.reduce((s, t) => s + plain(t).length, 0)
  const after = compressTools(tools).reduce((s, t) => s + plain(t).length, 0)
  return { before, after, saved: before - after, ratio: before ? (before - after) / before : 0 }
}

/** Cordis filter: compress the assembled catalog, degrade to unchanged on error. */
export function apply(ctx, config) {
  const disabled = config?.disabled === true
  let warned = false
  const warnOnce = (message) => {
    if (warned) return
    warned = true
    try {
      ctx.logger.warn(message)
    } catch {
      // No logger — guard exists only to avoid spamming.
    }
  }
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
    const assembled = await next()
    if (disabled) return assembled
    try {
      if (!Array.isArray(assembled.tools)) return assembled
      return { ...assembled, tools: compressTools(assembled.tools) }
    } catch (error) {
      warnOnce(`${name}: compress filter failed, exposing the unchanged catalog: ${String((error && error.message) || error)}`)
      return assembled
    }
  })
}