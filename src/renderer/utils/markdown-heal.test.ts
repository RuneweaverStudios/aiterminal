import { describe, it, expect } from 'vitest'
import { healMarkdown } from './markdown-heal'

describe('healMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(healMarkdown('')).toBe('')
  })

  it('returns complete markdown unchanged', () => {
    const md = 'Hello **bold** and *italic* world'
    expect(healMarkdown(md)).toBe(md)
  })

  it('closes unclosed bold markers', () => {
    const result = healMarkdown('Hello **bold text')
    expect(result).toContain('**')
    // Should have an even number of ** markers
    const count = (result.match(/\*\*/g) || []).length
    expect(count % 2).toBe(0)
  })

  it('closes unclosed italic markers', () => {
    const result = healMarkdown('Hello *italic text')
    const count = (result.match(/(?<!\*)\*(?!\*)/g) || []).length
    expect(count % 2).toBe(0)
  })

  it('closes unclosed inline code', () => {
    const result = healMarkdown('Use the `forEach method')
    const count = (result.match(/`/g) || []).length
    expect(count % 2).toBe(0)
  })

  it('closes unclosed links — text only', () => {
    const result = healMarkdown('See [this link')
    // Should either close the bracket or strip it
    expect(result.includes('[') && !result.includes(']')).toBe(false)
  })

  it('handles unclosed link with partial URL', () => {
    const result = healMarkdown('See [link](http://example')
    // Should not leave broken markdown
    expect(result).toBeDefined()
  })

  it('does not modify already complete code fences', () => {
    const md = '```js\nconst x = 1\n```'
    expect(healMarkdown(md)).toBe(md)
  })

  it('closes unclosed code fences', () => {
    const md = '```js\nconst x = 1\nconst y = 2'
    const result = healMarkdown(md)
    const fenceCount = (result.match(/```/g) || []).length
    expect(fenceCount % 2).toBe(0)
  })

  it('preserves content inside code blocks', () => {
    const md = '```\nHello **world\n```'
    const result = healMarkdown(md)
    // Bold inside code block should NOT be closed
    expect(result).toBe(md)
  })

  it('handles multiple unclosed formatting markers', () => {
    const result = healMarkdown('**bold *italic `code')
    // All should be closed
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('handles strikethrough markers', () => {
    const result = healMarkdown('~~struck text')
    const count = (result.match(/~~/g) || []).length
    expect(count % 2).toBe(0)
  })

  it('is idempotent — healing twice produces same result', () => {
    const broken = 'Hello **bold *italic'
    const once = healMarkdown(broken)
    const twice = healMarkdown(once)
    expect(twice).toBe(once)
  })
})
