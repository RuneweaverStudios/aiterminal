/**
 * Multi-step, multi-tool-calling tests for ALL model families.
 *
 * Tests the full pipeline: AI response → tag parsing → command extraction →
 * file operations → agent loop continuation — using realistic model outputs
 * against the real /Users/ghost/Desktop/ifyoubuildit repo structure.
 *
 * Model families tested:
 *   - GLM (budget: GLM-4.5 Air, GLM-4.7 Flash, GLM-5) — colon format, hybrid junk
 *   - QWen (QWen3 Coder) — mixed format, sometimes markdown blocks
 *   - Claude (Sonnet 4, Haiku 3.5) — canonical wrapper format
 *   - GPT (GPT-4o, GPT-4o Mini) — canonical wrapper, sometimes markdown
 *   - Gemini (Flash, Pro) — colon format, sometimes hybrid
 *   - DeepSeek (V3) — wrapper format, occasional colon
 *   - Llama (3.1 70B) — tends toward markdown code blocks
 *   - Mistral (Large) — canonical wrapper
 *   - Nemotron (free tier) — unpredictable format
 */

import { describe, it, expect } from 'vitest'
import { parseAgentResponse } from '@/agent/agent-service'

// ---------------------------------------------------------------------------
// Simulate applyRunTags logic (extracted from useChat for testability)
// ---------------------------------------------------------------------------

type ChatMode = 'normal' | 'plan' | 'autocode'

interface RunTagResult {
  readonly commands: readonly string[]
  readonly displayText: string
}

/**
 * Mirrors the applyRunTags logic from useChat.ts — extracts commands from
 * all model output formats and produces clean display text.
 */
function extractRunCommands(raw: string): readonly string[] {
  const seen = new Set<string>()
  const commands: string[] = []
  let match: RegExpExecArray | null

  const addCmd = (cmd: string) => {
    const c = cmd.trim()
    if (c && !seen.has(c)) { seen.add(c); commands.push(c) }
  }

  // Format A: [RUN:label]actual command[/RUN] — hybrid
  const hybridRegex = /\[RUN:[^\]]*\]([\s\S]*?)\[\/(?:RUN\]?)?/g
  while ((match = hybridRegex.exec(raw)) !== null) {
    const body = match[1].trim()
    if (body && /^[\w.\/~$-]/.test(body)) addCmd(body)
  }

  // Format B: [RUN]command[/RUN] — canonical wrapper
  const wrapperRegex = /\[RUN\](.*?)(?:\[\/(?:RUN\]?)?|$)/gs
  while ((match = wrapperRegex.exec(raw)) !== null) {
    addCmd(match[1])
  }

  // Format C: [RUN:command] — pure colon
  const colonRegex = /\[RUN:([^\]]+)\]/g
  while ((match = colonRegex.exec(raw)) !== null) {
    const cmd = match[1].trim()
    if (cmd && !/^(?:command|shell|terminal|run|exec|execute)$/i.test(cmd)) {
      addCmd(cmd)
    }
  }

  // Format D: ```bash\ncommand\n``` — code block fallback
  if (commands.length === 0) {
    const bashBlockRegex = /```(?:bash|sh|shell|zsh)\n([\s\S]*?)```/g
    while ((match = bashBlockRegex.exec(raw)) !== null) {
      const lines = match[1].trim().split('\n')
      for (const line of lines) {
        const cmd = line.trim()
        if (cmd && !cmd.startsWith('#')) addCmd(cmd)
      }
    }
  }

  return commands
}

/**
 * Strips all RUN tag variants from display text.
 */
function stripRunTags(raw: string): string {
  return raw
    // First: strip hybrid [RUN:label]body[/RUN] (with closing tag)
    .replace(/\[RUN:[^\]]*\][\s\S]*?\[\/(?:RUN\]?)?/g, '')
    // Then: strip wrapper [RUN]body[/RUN] or [RUN]body (to end)
    .replace(/\[RUN\][\s\S]*?(?:\[\/(?:RUN\]?)?|$)/gs, '')
    // Then: strip standalone colon tags [RUN:cmd]
    .replace(/\[RUN:[^\]]*\]/g, '')
    // Then: strip orphaned closing tags
    .replace(/\[\/RUN\]?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Strips all file operation tags from display text.
 */
function stripFileOpTags(raw: string): string {
  return raw
    .replace(/\[FILE:[^\]]+\][\s\S]*?\[\/FILE\]/g, '')
    .replace(/\[EDIT:[^\]]+\][\s\S]*?\[\/EDIT\]/g, '')
    .replace(/\[DELETE:[^\]]+\]/g, '')
    .replace(/\[READ:[^\]]+\]?/g, '')
    .trim()
}

// Target repo path for realistic tests
const REPO = '/Users/ghost/Desktop/ifyoubuildit'

// ============================================================================
// MODEL-SPECIFIC OUTPUT SAMPLES
// ============================================================================

const MODEL_OUTPUTS = {
  // GLM-4.5 Air — uses colon format, sometimes hybrid junk labels
  'glm-4.5-air': {
    singleRun: `I'll check the project. [RUN:pnpm test]`,
    multiRun: `Let me build and test:\n[RUN:pnpm build]\n[RUN:pnpm test]`,
    hybridJunk: `Running tests [RUN:command]pnpm test --reporter verbose[/RUN]`,
    readAndRun: `Let me check the config first.\n[READ:${REPO}/package.json]\nNow running:\n[RUN:pnpm test]`,
    multiStep: `Step 1: Read the config\n[READ:${REPO}/turbo.json]\nStep 2: Run build\n[RUN:pnpm build]\nStep 3: Run tests\n[RUN:pnpm test]`,
    editAndRun: `I'll fix the issue.\n[EDIT:${REPO}/apps/web/src/index.ts]\nconst x = 42\n[/EDIT]\n[RUN:pnpm build]`,
    withRedirect: `[RUN:pnpm test 2>&1 | head -50]`,
    emptyCommand: `[RUN:] nothing here`,
    shellLabel: `[RUN:shell]ls -la ${REPO}[/RUN]`,
  },

  // GLM-4.7 Flash — similar to Air but slightly more consistent
  'glm-4.7-flash': {
    singleRun: `Checking the project:\n[RUN:cd ${REPO} && pnpm test]`,
    multiRun: `[RUN:pnpm install]\n[RUN:pnpm build]\n[RUN:pnpm test]`,
    readFirst: `[READ:${REPO}/package.json]\n[READ:${REPO}/turbo.json]\nBased on the config, running:\n[RUN:pnpm test]`,
  },

  // QWen3 Coder — sometimes uses markdown code blocks instead of tags
  'qwen3-coder': {
    markdownFallback: "Let me run the tests:\n```bash\npnpm test\n```",
    multiMarkdown: "Building and testing:\n```bash\npnpm install\npnpm build\npnpm test\n```",
    colonFormat: `Testing: [RUN:pnpm test --reporter verbose]`,
    mixedFormat: `[READ:${REPO}/package.json]\nLet me build:\n\`\`\`bash\npnpm build\n\`\`\``,
    properWrapper: `[RUN]pnpm test[/RUN]`,
  },

  // Claude Sonnet 4 — canonical format, always correct
  'claude-sonnet-4': {
    singleRun: `I'll run the test suite.\n[RUN]pnpm test[/RUN]`,
    multiRun: `Let me verify the project:\n[RUN]pnpm install[/RUN]\n[RUN]pnpm build[/RUN]\n[RUN]pnpm test[/RUN]`,
    multiStep: `First, let me read the configuration:\n[READ:${REPO}/package.json]\n\nNow I'll check the database schema:\n[READ:${REPO}/packages/db/schema.ts]\n\nLet me run the build:\n[RUN]pnpm build[/RUN]\n\nAnd run tests:\n[RUN]pnpm test[/RUN]`,
    editFlow: `I found the issue. Let me fix it:\n[EDIT:${REPO}/apps/web/src/pages/index.astro]\n---\nimport Layout from '../layouts/Layout.astro';\n---\n<Layout title="Home">Hello</Layout>\n[/EDIT]\n\nNow verifying:\n[RUN]pnpm build[/RUN]`,
    createFile: `[FILE:${REPO}/apps/web/src/utils/helper.ts]\nexport function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n[/FILE]\n[RUN]pnpm test[/RUN]`,
    searchReplace: `[EDIT:${REPO}/package.json]\n<<<< SEARCH\n"test": "vitest run"\n====\n"test": "vitest run --reporter verbose"\n>>>> REPLACE\n[/EDIT]`,
  },

  // GPT-4o — mostly canonical, occasionally markdown
  'gpt-4o': {
    singleRun: `[RUN]pnpm test[/RUN]`,
    multiRun: `[RUN]pnpm build[/RUN]\n[RUN]pnpm test[/RUN]`,
    withExplanation: `Let me check the project health.\n\n[RUN]pnpm install[/RUN]\n\nNow running the test suite:\n\n[RUN]pnpm test[/RUN]`,
    readAndEdit: `[READ:${REPO}/package.json]\n\nI see the issue. Updating the script:\n\n[EDIT:${REPO}/package.json]\n{\n  "scripts": { "test": "vitest" }\n}\n[/EDIT]`,
  },

  // Gemini 2.0 Flash — prefers colon format
  'gemini-flash': {
    singleRun: `[RUN:pnpm test]`,
    multiRun: `[RUN:pnpm install] [RUN:pnpm build] [RUN:pnpm test]`,
    withText: `I'll verify the project.\n[RUN:pnpm test --reporter verbose]\nThis will show detailed results.`,
    readFirst: `[READ:${REPO}/package.json]\n[RUN:pnpm test]`,
  },

  // DeepSeek V3 — wrapper format mostly
  'deepseek-v3': {
    singleRun: `[RUN]pnpm test[/RUN]`,
    readAndRun: `[READ:${REPO}/package.json]\n\nBased on the configuration:\n[RUN]pnpm build[/RUN]\n[RUN]pnpm test[/RUN]`,
  },

  // Llama 3.1 — tends toward markdown blocks
  'llama-3.1': {
    markdownOnly: "Here's how to test:\n```bash\npnpm test\n```",
    multiMarkdown: "Let's build and test:\n```sh\npnpm install\npnpm build\npnpm test\n```",
    withComments: "Running the suite:\n```bash\n# Install dependencies\npnpm install\n# Build the project\npnpm build\n# Run tests\npnpm test\n```",
  },

  // Nemotron (free tier) — unpredictable, sometimes broken
  'nemotron': {
    colonFormat: `[RUN:pnpm test]`,
    brokenWrapper: `[RUN]pnpm test`,  // Missing closing tag
    halfTag: `[RUN:pnpm test`,  // Missing closing bracket
    plainText: `You should run pnpm test to verify.`,  // No tags at all
  },
}

// ============================================================================
// TESTS: Single command extraction per model
// ============================================================================

describe('Single command extraction', () => {
  it('GLM-4.5 Air: colon format [RUN:cmd]', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].singleRun)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('GLM-4.5 Air: hybrid junk label [RUN:command]real cmd[/RUN]', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].hybridJunk)
    expect(cmds).toEqual(['pnpm test --reporter verbose'])
  })

  it('GLM-4.5 Air: shell label [RUN:shell]cmd[/RUN]', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].shellLabel)
    expect(cmds).toEqual([`ls -la ${REPO}`])
  })

  it('GLM-4.5 Air: command with redirect', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].withRedirect)
    expect(cmds).toEqual(['pnpm test 2>&1 | head -50'])
  })

  it('GLM-4.5 Air: ignores empty [RUN:] tag', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].emptyCommand)
    expect(cmds).toHaveLength(0)
  })

  it('QWen3 Coder: markdown bash block fallback', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['qwen3-coder'].markdownFallback)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('QWen3 Coder: proper wrapper format', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['qwen3-coder'].properWrapper)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Claude Sonnet 4: canonical [RUN]cmd[/RUN]', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['claude-sonnet-4'].singleRun)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('GPT-4o: canonical wrapper', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['gpt-4o'].singleRun)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Gemini Flash: colon format', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['gemini-flash'].singleRun)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('DeepSeek V3: wrapper format', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['deepseek-v3'].singleRun)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Llama 3.1: markdown bash block', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['llama-3.1'].markdownOnly)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Nemotron: colon format', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['nemotron'].colonFormat)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Nemotron: broken wrapper (missing [/RUN]) still extracts', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['nemotron'].brokenWrapper)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Nemotron: plain text with no tags returns empty', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['nemotron'].plainText)
    expect(cmds).toHaveLength(0)
  })
})

// ============================================================================
// TESTS: Multi-command extraction per model
// ============================================================================

describe('Multi-command extraction', () => {
  it('GLM-4.5 Air: multiple colon tags', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.5-air'].multiRun)
    expect(cmds).toEqual(['pnpm build', 'pnpm test'])
  })

  it('GLM-4.7 Flash: three colon tags', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['glm-4.7-flash'].multiRun)
    expect(cmds).toEqual(['pnpm install', 'pnpm build', 'pnpm test'])
  })

  it('QWen3 Coder: multi-line bash block', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['qwen3-coder'].multiMarkdown)
    expect(cmds).toEqual(['pnpm install', 'pnpm build', 'pnpm test'])
  })

  it('Claude Sonnet 4: three wrapper tags', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['claude-sonnet-4'].multiRun)
    expect(cmds).toEqual(['pnpm install', 'pnpm build', 'pnpm test'])
  })

  it('GPT-4o: two wrapper tags', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['gpt-4o'].multiRun)
    expect(cmds).toEqual(['pnpm build', 'pnpm test'])
  })

  it('Gemini Flash: space-separated colon tags', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['gemini-flash'].multiRun)
    expect(cmds).toEqual(['pnpm install', 'pnpm build', 'pnpm test'])
  })

  it('Llama 3.1: multi-line bash with comments (skips #comments)', () => {
    const cmds = extractRunCommands(MODEL_OUTPUTS['llama-3.1'].withComments)
    expect(cmds).toEqual(['pnpm install', 'pnpm build', 'pnpm test'])
  })

  it('deduplicates identical commands', () => {
    const cmds = extractRunCommands('[RUN:pnpm test] and again [RUN:pnpm test]')
    expect(cmds).toEqual(['pnpm test'])
  })
})

// ============================================================================
// TESTS: Multi-tool (READ + RUN + EDIT) workflows
// ============================================================================

describe('Multi-tool workflows', () => {
  it('GLM-4.5 Air: READ then RUN', () => {
    const raw = MODEL_OUTPUTS['glm-4.5-air'].readAndRun
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    expect(ops.some(op => op.type === 'read' && op.filePath === `${REPO}/package.json`)).toBe(true)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('GLM-4.5 Air: multi-step READ + RUN + RUN', () => {
    const raw = MODEL_OUTPUTS['glm-4.5-air'].multiStep
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    expect(ops.filter(op => op.type === 'read')).toHaveLength(1)
    expect(ops[0].filePath).toBe(`${REPO}/turbo.json`)
    expect(cmds).toContain('pnpm build')
    expect(cmds).toContain('pnpm test')
  })

  it('GLM-4.5 Air: EDIT then RUN (verify after fix)', () => {
    const raw = MODEL_OUTPUTS['glm-4.5-air'].editAndRun
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    const editOps = ops.filter(op => op.type === 'edit')
    expect(editOps).toHaveLength(1)
    expect(editOps[0].filePath).toBe(`${REPO}/apps/web/src/index.ts`)
    expect(cmds).toEqual(['pnpm build'])
  })

  it('GLM-4.7 Flash: multiple READs then RUN', () => {
    const raw = MODEL_OUTPUTS['glm-4.7-flash'].readFirst
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    const reads = ops.filter(op => op.type === 'read')
    expect(reads).toHaveLength(2)
    expect(reads[0].filePath).toBe(`${REPO}/package.json`)
    expect(reads[1].filePath).toBe(`${REPO}/turbo.json`)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('QWen3 Coder: READ then markdown bash block', () => {
    const raw = MODEL_OUTPUTS['qwen3-coder'].mixedFormat
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    expect(ops.some(op => op.type === 'read')).toBe(true)
    expect(cmds).toEqual(['pnpm build'])
  })

  it('Claude Sonnet 4: full multi-step workflow', () => {
    const raw = MODEL_OUTPUTS['claude-sonnet-4'].multiStep
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    const reads = ops.filter(op => op.type === 'read')
    expect(reads).toHaveLength(2)
    expect(reads[0].filePath).toBe(`${REPO}/package.json`)
    expect(reads[1].filePath).toBe(`${REPO}/packages/db/schema.ts`)
    expect(cmds).toEqual(['pnpm build', 'pnpm test'])
  })

  it('Claude Sonnet 4: EDIT then RUN verification', () => {
    const raw = MODEL_OUTPUTS['claude-sonnet-4'].editFlow
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    const edits = ops.filter(op => op.type === 'edit')
    expect(edits).toHaveLength(1)
    expect(edits[0].content).toContain('Layout')
    expect(cmds).toEqual(['pnpm build'])
  })

  it('Claude Sonnet 4: CREATE file then RUN', () => {
    const raw = MODEL_OUTPUTS['claude-sonnet-4'].createFile
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    const creates = ops.filter(op => op.type === 'create')
    expect(creates).toHaveLength(1)
    expect(creates[0].filePath).toBe(`${REPO}/apps/web/src/utils/helper.ts`)
    expect(creates[0].content).toContain('greet')
    expect(cmds).toEqual(['pnpm test'])
  })

  it('Claude Sonnet 4: search/replace EDIT', () => {
    const raw = MODEL_OUTPUTS['claude-sonnet-4'].searchReplace
    const ops = parseAgentResponse(raw)

    const edits = ops.filter(op => op.type === 'edit')
    expect(edits).toHaveLength(1)
    expect(edits[0].searchText).toContain('vitest run')
    expect(edits[0].replaceText).toContain('--reporter verbose')
  })

  it('GPT-4o: READ then EDIT flow', () => {
    const raw = MODEL_OUTPUTS['gpt-4o'].readAndEdit
    const ops = parseAgentResponse(raw)

    const reads = ops.filter(op => op.type === 'read')
    const edits = ops.filter(op => op.type === 'edit')
    expect(reads).toHaveLength(1)
    expect(edits).toHaveLength(1)
  })

  it('Gemini Flash: READ then RUN', () => {
    const raw = MODEL_OUTPUTS['gemini-flash'].readFirst
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    expect(ops.some(op => op.type === 'read')).toBe(true)
    expect(cmds).toEqual(['pnpm test'])
  })

  it('DeepSeek V3: READ then multi-RUN', () => {
    const raw = MODEL_OUTPUTS['deepseek-v3'].readAndRun
    const ops = parseAgentResponse(raw)
    const cmds = extractRunCommands(raw)

    expect(ops.some(op => op.type === 'read')).toBe(true)
    expect(cmds).toEqual(['pnpm build', 'pnpm test'])
  })
})

// ============================================================================
// TESTS: Display text stripping (no tag leakage to UI)
// ============================================================================

describe('Display text stripping', () => {
  it('strips colon format RUN tags', () => {
    const display = stripRunTags('Before [RUN:pnpm test] after')
    expect(display).not.toContain('[RUN')
    expect(display).toContain('Before')
    expect(display).toContain('after')
  })

  it('strips wrapper format RUN tags', () => {
    const display = stripRunTags('Before [RUN]pnpm test[/RUN] after')
    expect(display).not.toContain('[RUN')
    expect(display).not.toContain('[/RUN')
  })

  it('strips hybrid format RUN tags', () => {
    const display = stripRunTags('Before [RUN:command]pnpm test[/RUN] after')
    expect(display).not.toContain('[RUN')
    expect(display).not.toContain('[/RUN')
  })

  it('strips file operation tags', () => {
    const raw = `Hello\n[READ:${REPO}/package.json]\n[EDIT:${REPO}/foo.ts]\ncontent\n[/EDIT]\n[DELETE:${REPO}/bar.ts]\nDone`
    const display = stripFileOpTags(raw)
    expect(display).not.toContain('[READ')
    expect(display).not.toContain('[EDIT')
    expect(display).not.toContain('[DELETE')
    expect(display).toContain('Hello')
    expect(display).toContain('Done')
  })

  it('strips broken/partial tags cleanly', () => {
    const display = stripRunTags('[RUN]pnpm test')  // Missing [/RUN]
    expect(display).not.toContain('[RUN')
  })

  it('handles multiple tag types in one response', () => {
    const raw = `Reading config.\n[READ:${REPO}/package.json]\nFixing build.\n[EDIT:${REPO}/tsconfig.json]\n{}\n[/EDIT]\nRunning.\n[RUN:pnpm build]`
    const display = stripFileOpTags(stripRunTags(raw))
    expect(display).not.toContain('[')
    expect(display).toContain('Reading config')
    expect(display).toContain('Fixing build')
    expect(display).toContain('Running')
  })
})

// ============================================================================
// TESTS: Agent loop continuation detection
// ============================================================================

describe('Agent loop continuation detection', () => {
  function shouldContinue(accumulated: string, operations: readonly { type: string }[]): boolean {
    const hasWriteOps = operations.some(op => op.type !== 'read')
    const hasRunOps = accumulated.includes('[RUN]') || accumulated.includes('[RUN:')
    return hasWriteOps || hasRunOps
  }

  function shouldNudge(accumulated: string, operations: readonly { type: string }[]): boolean {
    const noOps = operations.length === 0
    const noRun = !accumulated.includes('[RUN]') && !accumulated.includes('[RUN:')
    const notDone = !/\bcomplete\b|\bdone\b|\bfinished\b/i.test(accumulated)
    const hasContent = accumulated.trim().length > 20
    return noOps && noRun && notDone && hasContent
  }

  function shouldStop(accumulated: string, operations: readonly { type: string }[]): boolean {
    const nothingDone = operations.length === 0
    const isDone = /\bcomplete\b|\bdone\b|\bfinished\b/i.test(accumulated)
    return nothingDone && isDone
  }

  it('continues after RUN commands (colon format)', () => {
    expect(shouldContinue('[RUN:pnpm build]', [])).toBe(true)
  })

  it('continues after RUN commands (wrapper format)', () => {
    expect(shouldContinue('[RUN]pnpm build[/RUN]', [])).toBe(true)
  })

  it('continues after EDIT operations', () => {
    const ops = [{ type: 'edit' }]
    expect(shouldContinue('Fixed the file', ops)).toBe(true)
  })

  it('does NOT continue for read-only operations', () => {
    const ops = [{ type: 'read' }]
    expect(shouldContinue('Read the file', ops)).toBe(false)
  })

  it('nudges when AI describes intent but uses no tool tags', () => {
    const text = 'I will read the package.json and then run the tests to verify everything works correctly.'
    expect(shouldNudge(text, [])).toBe(true)
  })

  it('does NOT nudge when AI says "complete"', () => {
    const text = 'All tasks are complete. The project builds and tests pass.'
    expect(shouldNudge(text, [])).toBe(false)
  })

  it('does NOT nudge when AI used RUN tags', () => {
    const text = 'Running tests [RUN:pnpm test]'
    expect(shouldNudge(text, [])).toBe(false)
  })

  it('stops when AI says "done" with no operations', () => {
    expect(shouldStop('Everything is done. All tests pass.', [])).toBe(true)
    expect(shouldStop('Task finished successfully.', [])).toBe(true)
    expect(shouldStop('The migration is complete.', [])).toBe(true)
  })

  it('does NOT stop when AI says "done" but has operations', () => {
    const ops = [{ type: 'edit' }]
    expect(shouldStop('Done, applied the fix.', ops)).toBe(false)
  })
})

// ============================================================================
// TESTS: Edge cases and adversarial inputs
// ============================================================================

describe('Edge cases', () => {
  it('handles nested brackets in commands', () => {
    const cmds = extractRunCommands('[RUN:echo "hello [world]"]')
    // This may or may not extract cleanly — key is no crash
    expect(cmds.length).toBeGreaterThanOrEqual(0)
  })

  it('handles extremely long commands', () => {
    const longCmd = 'pnpm test ' + '--flag '.repeat(100)
    const cmds = extractRunCommands(`[RUN:${longCmd}]`)
    expect(cmds[0]).toContain('pnpm test')
  })

  it('handles empty response', () => {
    expect(extractRunCommands('')).toEqual([])
    expect(parseAgentResponse('')).toEqual([])
  })

  it('handles response with only whitespace', () => {
    expect(extractRunCommands('   \n\n   ')).toEqual([])
  })

  it('rejects path traversal in file operations', () => {
    const ops = parseAgentResponse('[READ:../../etc/passwd]')
    expect(ops).toHaveLength(0)
  })

  it('handles unicode in commands', () => {
    const cmds = extractRunCommands('[RUN:echo "こんにちは"]')
    expect(cmds).toHaveLength(1)
  })

  it('does NOT extract from inside markdown code blocks when other tags exist', () => {
    // If RUN tags exist, bash blocks should NOT also be extracted
    const raw = '[RUN:pnpm test]\n```bash\npnpm build\n```'
    const cmds = extractRunCommands(raw)
    expect(cmds).toEqual(['pnpm test'])
    expect(cmds).not.toContain('pnpm build')
  })

  it('handles mixed colon and wrapper in same response', () => {
    const cmds = extractRunCommands('[RUN:pnpm install]\n[RUN]pnpm build[/RUN]\n[RUN:pnpm test]')
    expect(cmds).toContain('pnpm install')
    expect(cmds).toContain('pnpm build')
    expect(cmds).toContain('pnpm test')
  })
})

// ============================================================================
// TESTS: Full pipeline simulation per model
// ============================================================================

describe('Full pipeline: parse → extract → strip → verify', () => {
  const testFullPipeline = (name: string, raw: string, expectedCmds: string[], expectedReadCount: number, expectedEditCount: number) => {
    it(`${name}`, () => {
      const ops = parseAgentResponse(raw)
      const cmds = extractRunCommands(raw)
      const display = stripFileOpTags(stripRunTags(raw))

      // Commands extracted correctly
      expect(cmds).toEqual(expectedCmds)

      // File operations parsed
      expect(ops.filter(o => o.type === 'read')).toHaveLength(expectedReadCount)
      expect(ops.filter(o => o.type === 'edit' || o.type === 'create')).toHaveLength(expectedEditCount)

      // Display text is clean (no tag leakage)
      expect(display).not.toMatch(/\[RUN/)
      expect(display).not.toMatch(/\[READ/)
      expect(display).not.toMatch(/\[EDIT/)
      expect(display).not.toMatch(/\[\//)
    })
  }

  testFullPipeline(
    'GLM-4.5 Air: full multi-step',
    MODEL_OUTPUTS['glm-4.5-air'].multiStep,
    ['pnpm build', 'pnpm test'],
    1, 0,
  )

  testFullPipeline(
    'GLM-4.5 Air: edit + run',
    MODEL_OUTPUTS['glm-4.5-air'].editAndRun,
    ['pnpm build'],
    0, 1,
  )

  testFullPipeline(
    'Claude Sonnet 4: full multi-step',
    MODEL_OUTPUTS['claude-sonnet-4'].multiStep,
    ['pnpm build', 'pnpm test'],
    2, 0,
  )

  testFullPipeline(
    'Claude Sonnet 4: edit flow',
    MODEL_OUTPUTS['claude-sonnet-4'].editFlow,
    ['pnpm build'],
    0, 1,
  )

  testFullPipeline(
    'Claude Sonnet 4: create + run',
    MODEL_OUTPUTS['claude-sonnet-4'].createFile,
    ['pnpm test'],
    0, 1,
  )

  testFullPipeline(
    'GPT-4o: read + edit',
    MODEL_OUTPUTS['gpt-4o'].readAndEdit,
    [],
    1, 1,
  )

  testFullPipeline(
    'QWen3 Coder: read + markdown bash',
    MODEL_OUTPUTS['qwen3-coder'].mixedFormat,
    ['pnpm build'],
    1, 0,
  )

  testFullPipeline(
    'Gemini Flash: read + colon run',
    MODEL_OUTPUTS['gemini-flash'].readFirst,
    ['pnpm test'],
    1, 0,
  )

  testFullPipeline(
    'DeepSeek V3: read + multi-run',
    MODEL_OUTPUTS['deepseek-v3'].readAndRun,
    ['pnpm build', 'pnpm test'],
    1, 0,
  )
})
