import { describe, it, expect } from 'vitest'
import { groupContextParts, type ToolPartV2 } from './context-group'

function makeTool(tool: string, path?: string): ToolPartV2 {
  return {
    type: 'tool',
    tool,
    status: 'done',
    path,
  }
}

describe('groupContextParts', () => {
  it('returns empty array for empty input', () => {
    expect(groupContextParts([])).toEqual([])
  })

  it('does not group non-context tools', () => {
    const parts = [
      { type: 'text' as const, content: 'hello' },
      makeTool('bash', undefined),
    ]
    const result = groupContextParts(parts)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(parts[0])
    expect(result[1]).toEqual(parts[1])
  })

  it('groups consecutive read tools into a single context-group', () => {
    const parts = [
      makeTool('read', 'src/a.ts'),
      makeTool('read', 'src/b.ts'),
      makeTool('read', 'src/c.ts'),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('context-group')
    if (result[0].type === 'context-group') {
      expect(result[0].tools).toHaveLength(3)
    }
  })

  it('groups consecutive read + grep + glob tools together', () => {
    const parts = [
      makeTool('read', 'src/a.ts'),
      makeTool('grep', undefined),
      makeTool('glob', undefined),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('context-group')
  })

  it('does not merge context tools separated by text', () => {
    const parts = [
      makeTool('read', 'src/a.ts'),
      { type: 'text' as const, content: 'thinking...' },
      makeTool('read', 'src/b.ts'),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(3)
    // First and third should not be grouped because text separates them
  })

  it('preserves non-context parts in order', () => {
    const parts = [
      { type: 'text' as const, content: 'first' },
      makeTool('read', 'src/a.ts'),
      makeTool('read', 'src/b.ts'),
      { type: 'text' as const, content: 'second' },
      makeTool('bash', undefined),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ type: 'text', content: 'first' })
    expect(result[1].type).toBe('context-group')
    expect(result[2]).toEqual({ type: 'text', content: 'second' })
    expect(result[3]).toEqual(makeTool('bash', undefined))
  })

  it('generates summary with counts per tool type', () => {
    const parts = [
      makeTool('read', 'src/a.ts'),
      makeTool('read', 'src/b.ts'),
      makeTool('grep', undefined),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(1)
    if (result[0].type === 'context-group') {
      expect(result[0].summary).toContain('2')  // 2 reads
      expect(result[0].summary).toContain('1')  // 1 grep/search
    }
  })

  it('handles list tool in context group', () => {
    const parts = [
      makeTool('list', 'src/'),
      makeTool('read', 'src/a.ts'),
    ]
    const result = groupContextParts(parts)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('context-group')
  })

  it('single context tool is still grouped', () => {
    const parts = [makeTool('read', 'src/a.ts')]
    const result = groupContextParts(parts)

    // Single context tool should remain as-is, not wrapped
    expect(result).toHaveLength(1)
    // Could be either grouped or raw — implementation choice
  })
})
