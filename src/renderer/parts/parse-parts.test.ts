import { describe, it, expect } from 'vitest'
import { parseIntoParts, type MessagePartV2 } from './parse-parts'

describe('parseIntoParts', () => {
  it('returns single text part for plain text', () => {
    const parts = parseIntoParts('Hello world')
    expect(parts).toHaveLength(1)
    expect(parts[0].type).toBe('text')
    if (parts[0].type === 'text') {
      expect(parts[0].content).toBe('Hello world')
    }
  })

  it('returns empty array for empty string', () => {
    const parts = parseIntoParts('')
    expect(parts).toHaveLength(0)
  })

  it('extracts tool call from [TOOL:read] tags', () => {
    const input = 'Before\n[TOOL:read path="src/a.ts"]\nAfter'
    const parts = parseIntoParts(input)

    const toolParts = parts.filter(p => p.type === 'tool')
    expect(toolParts.length).toBeGreaterThanOrEqual(1)
    if (toolParts[0]?.type === 'tool') {
      expect(toolParts[0].tool).toBe('read')
      expect(toolParts[0].path).toBe('src/a.ts')
    }
  })

  it('extracts tool call from [TOOL:bash] tags', () => {
    const input = '[TOOL:bash command="npm test"]'
    const parts = parseIntoParts(input)

    const toolParts = parts.filter(p => p.type === 'tool')
    expect(toolParts.length).toBe(1)
    if (toolParts[0]?.type === 'tool') {
      expect(toolParts[0].tool).toBe('bash')
      expect(toolParts[0].command).toBe('npm test')
    }
  })

  it('preserves text between tool calls', () => {
    const input = 'Start\n[TOOL:read path="a.ts"]\nMiddle\n[TOOL:read path="b.ts"]\nEnd'
    const parts = parseIntoParts(input)

    const textParts = parts.filter(p => p.type === 'text')
    expect(textParts.length).toBeGreaterThanOrEqual(2)
  })

  it('extracts reasoning blocks', () => {
    const input = '<thinking>I need to analyze this</thinking>\nHere is my answer'
    const parts = parseIntoParts(input)

    const reasoning = parts.filter(p => p.type === 'reasoning')
    expect(reasoning.length).toBe(1)
    if (reasoning[0]?.type === 'reasoning') {
      expect(reasoning[0].content).toContain('analyze')
    }
  })

  it('handles mixed content with text, tools, and reasoning', () => {
    const input = [
      '<thinking>Let me think</thinking>',
      'I will read the file.',
      '[TOOL:read path="src/main.ts"]',
      'The file contains the entry point.',
    ].join('\n')

    const parts = parseIntoParts(input)

    const types = parts.map(p => p.type)
    expect(types).toContain('reasoning')
    expect(types).toContain('text')
    expect(types).toContain('tool')
  })

  it('handles legacy emoji format for backwards compatibility', () => {
    const input = '⚡ Executed: `npm test`'
    const parts = parseIntoParts(input)

    // Should extract as a tool part
    const toolParts = parts.filter(p => p.type === 'tool')
    expect(toolParts.length).toBe(1)
  })

  it('handles content with no recognizable patterns as pure text', () => {
    const input = 'Just a regular response with some thoughts about code.'
    const parts = parseIntoParts(input)

    expect(parts).toHaveLength(1)
    expect(parts[0].type).toBe('text')
  })
})
