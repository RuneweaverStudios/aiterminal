/**
 * MemoryStore — Hermes-style persistent agent memory.
 *
 * Two files:
 *   MEMORY.md — agent's learned lessons, env facts, tool quirks
 *   USER.md   — user preferences, communication style, corrections
 *
 * Entries delimited by § (U+00A7). Injected into system prompt at session start.
 * Writes are atomic (temp file + rename). Security scanned for injection.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const MEMORIES_DIR = path.join(os.homedir(), '.aiterminal', 'memories')
const MEMORY_FILE = path.join(MEMORIES_DIR, 'MEMORY.md')
const USER_FILE = path.join(MEMORIES_DIR, 'USER.md')

const MEMORY_CHAR_LIMIT = 2200
const USER_CHAR_LIMIT = 1375
const DELIMITER = '\n§\n'

// ---------------------------------------------------------------------------
// Security scanner — block prompt injection in saved memories
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /curl\s+.*\$\{?[A-Z_]*KEY/i,
  /wget\s+.*secret/i,
  /ssh\s+-R/i,
  /reverse\s+shell/i,
  /\x00/,  // null bytes
  /[\u200B-\u200F\u2028-\u202F\uFEFF]/, // invisible unicode
]

function scanMemoryContent(content: string): { safe: boolean; reason?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: `Blocked: content matches injection pattern ${pattern.source}` }
    }
  }
  return { safe: true }
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

function ensureDir(): void {
  if (!fs.existsSync(MEMORIES_DIR)) {
    fs.mkdirSync(MEMORIES_DIR, { recursive: true })
  }
}

function readFile(filePath: string): string {
  ensureDir()
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function writeFileAtomic(filePath: string, content: string): void {
  ensureDir()
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, content, 'utf-8')
  fs.renameSync(tmp, filePath)
}

function getEntries(filePath: string): string[] {
  const content = readFile(filePath)
  if (!content.trim()) return []
  return content.split('§').map(e => e.trim()).filter(Boolean)
}

function setEntries(filePath: string, entries: string[]): void {
  const content = entries.length > 0 ? entries.join(DELIMITER) + '\n' : ''
  writeFileAtomic(filePath, content)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type MemoryFile = 'MEMORY.md' | 'USER.md'
export type MemoryAction = 'add' | 'replace' | 'remove'

function resolveFile(file: MemoryFile): { path: string; limit: number } {
  return file === 'USER.md'
    ? { path: USER_FILE, limit: USER_CHAR_LIMIT }
    : { path: MEMORY_FILE, limit: MEMORY_CHAR_LIMIT }
}

export interface MemoryToolResult {
  readonly success: boolean
  readonly error?: string
  readonly entries?: readonly string[]
  readonly usage?: { chars: number; limit: number; percent: number }
}

export function memoryRead(file: MemoryFile): string {
  const { path: filePath } = resolveFile(file)
  return readFile(filePath)
}

export function memoryReadAll(): { memory: string; user: string } {
  return {
    memory: readFile(MEMORY_FILE),
    user: readFile(USER_FILE),
  }
}

export function memoryTool(
  action: MemoryAction,
  file: MemoryFile,
  content?: string,
  oldText?: string,
  newText?: string,
): MemoryToolResult {
  const { path: filePath, limit } = resolveFile(file)
  const entries = getEntries(filePath)

  const currentChars = entries.join('§').length

  switch (action) {
    case 'add': {
      if (!content || content.trim().length === 0) {
        return { success: false, error: 'Content is required for add action' }
      }

      const scan = scanMemoryContent(content)
      if (!scan.safe) {
        return { success: false, error: scan.reason }
      }

      const newChars = currentChars + content.length + 3 // §\n
      if (newChars > limit) {
        return {
          success: false,
          error: `Memory full (${currentChars}/${limit} chars, ${Math.round(currentChars / limit * 100)}% used). Remove or consolidate entries first.`,
          entries,
          usage: { chars: currentChars, limit, percent: Math.round(currentChars / limit * 100) },
        }
      }

      // Check for duplicates
      const normalized = content.trim().toLowerCase()
      if (entries.some(e => e.toLowerCase() === normalized)) {
        return { success: false, error: 'Duplicate entry already exists' }
      }

      const updated = [...entries, content.trim()]
      setEntries(filePath, updated)

      const newTotal = updated.join('§').length
      return {
        success: true,
        usage: { chars: newTotal, limit, percent: Math.round(newTotal / limit * 100) },
      }
    }

    case 'replace': {
      if (!oldText || !newText) {
        return { success: false, error: 'Both old_text and new_text are required for replace action' }
      }

      const scan = scanMemoryContent(newText)
      if (!scan.safe) {
        return { success: false, error: scan.reason }
      }

      const idx = entries.findIndex(e => e.includes(oldText))
      if (idx === -1) {
        return {
          success: false,
          error: `No entry containing "${oldText.slice(0, 50)}" found`,
          entries,
        }
      }

      const updated = [...entries]
      updated[idx] = entries[idx].replace(oldText, newText)
      setEntries(filePath, updated)

      const newTotal = updated.join('§').length
      return {
        success: true,
        usage: { chars: newTotal, limit, percent: Math.round(newTotal / limit * 100) },
      }
    }

    case 'remove': {
      if (!content) {
        return { success: false, error: 'Content is required for remove action' }
      }

      const idx = entries.findIndex(e => e.includes(content))
      if (idx === -1) {
        return {
          success: false,
          error: `No entry containing "${content.slice(0, 50)}" found`,
          entries,
        }
      }

      const updated = entries.filter((_, i) => i !== idx)
      setEntries(filePath, updated)

      const newTotal = updated.join('§').length
      return {
        success: true,
        usage: { chars: newTotal, limit, percent: Math.round(newTotal / limit * 100) },
      }
    }

    default:
      return { success: false, error: `Unknown action: ${action}` }
  }
}

/**
 * Format memory for system prompt injection.
 * Returns a block that should be prepended to the system prompt.
 */
export function formatMemoryForPrompt(): string {
  const { memory, user } = memoryReadAll()

  const parts: string[] = []

  if (memory.trim()) {
    parts.push(`<agent_memory>\n${memory.trim()}\n</agent_memory>`)
  }

  if (user.trim()) {
    parts.push(`<user_profile>\n${user.trim()}\n</user_profile>`)
  }

  return parts.join('\n\n')
}
