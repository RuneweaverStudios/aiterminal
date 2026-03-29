/**
 * Context group — merges consecutive context-gathering tool calls
 * (read, grep, glob, list) into a single collapsible summary.
 *
 * Instead of showing 5 individual "read src/a.ts" cards, shows:
 * "Gathered context: 3 files read, 2 searches"
 *
 * Inspired by OpenCode's ContextToolGroup pattern.
 */

export interface ToolPartV2 {
  readonly type: 'tool'
  readonly tool: string
  readonly status: 'pending' | 'running' | 'done' | 'error'
  readonly path?: string
  readonly command?: string
  readonly output?: string
  readonly error?: string
}

export interface ContextGroupPart {
  readonly type: 'context-group'
  readonly tools: readonly ToolPartV2[]
  readonly summary: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnyPart {
  readonly type: string
}

const CONTEXT_TOOLS = new Set(['read', 'grep', 'glob', 'list'])

function isContextTool(part: AnyPart): boolean {
  return part.type === 'tool' && CONTEXT_TOOLS.has((part as unknown as ToolPartV2).tool)
}

function buildSummary(tools: readonly ToolPartV2[]): string {
  const counts = new Map<string, number>()
  for (const tool of tools) {
    const key = tool.tool
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const parts: string[] = []
  const readCount = counts.get('read') ?? 0
  const grepCount = counts.get('grep') ?? 0
  const globCount = counts.get('glob') ?? 0
  const listCount = counts.get('list') ?? 0

  if (readCount > 0) parts.push(`${readCount} file${readCount > 1 ? 's' : ''} read`)
  if (grepCount > 0) parts.push(`${grepCount} search${grepCount > 1 ? 'es' : ''}`)
  if (globCount > 0) parts.push(`${globCount} glob${globCount > 1 ? 's' : ''}`)
  if (listCount > 0) parts.push(`${listCount} list${listCount > 1 ? 's' : ''}`)

  return `Gathered context: ${parts.join(', ')}`
}

/**
 * Process a flat array of message parts, merging consecutive context-gathering
 * tool calls into ContextGroupParts.
 */
export function groupContextParts(parts: readonly AnyPart[]): readonly AnyPart[] {
  if (parts.length === 0) return []

  const result: AnyPart[] = []
  let contextBuffer: ToolPartV2[] = []

  function flushBuffer() {
    if (contextBuffer.length === 0) return

    const group: ContextGroupPart = {
      type: 'context-group',
      tools: [...contextBuffer],
      summary: buildSummary(contextBuffer),
    }
    result.push(group)
    contextBuffer = []
  }

  for (const part of parts) {
    if (isContextTool(part)) {
      contextBuffer.push(part as unknown as ToolPartV2)
    } else {
      flushBuffer()
      result.push(part)
    }
  }

  flushBuffer()
  return result
}
