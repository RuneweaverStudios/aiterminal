import { describe, it, expect } from 'vitest'
import { splitStreamBlocks, type StreamBlock } from './markdown-stream'

describe('splitStreamBlocks', () => {
  describe('non-streaming (complete) content', () => {
    it('returns single full block for complete content', () => {
      const blocks = splitStreamBlocks('Hello world', false)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].mode).toBe('full')
      expect(blocks[0].content).toBe('Hello world')
    })

    it('returns single full block for content with complete code fence', () => {
      const md = 'Text before\n```js\nconst x = 1\n```\nText after'
      const blocks = splitStreamBlocks(md, false)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].mode).toBe('full')
    })
  })

  describe('streaming (live) content', () => {
    it('returns single live block for plain text', () => {
      const blocks = splitStreamBlocks('Hello world in progress', true)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].mode).toBe('live')
    })

    it('splits into head (live) + code (live) when code fence is open', () => {
      const md = 'Some text\n```js\nconst x = 1\nconst y = 2'
      const blocks = splitStreamBlocks(md, true)

      expect(blocks.length).toBeGreaterThanOrEqual(2)
      // First block should contain the text before code
      expect(blocks[0].content).toContain('Some text')
      // Last block should contain the code
      const lastBlock = blocks[blocks.length - 1]
      expect(lastBlock.content).toContain('const x = 1')
    })

    it('does NOT split when code fence is closed', () => {
      const md = 'Text\n```js\nconst x = 1\n```\nMore text'
      const blocks = splitStreamBlocks(md, true)

      // Should be single block since code fence is closed
      expect(blocks).toHaveLength(1)
      expect(blocks[0].mode).toBe('live')
    })

    it('handles empty input', () => {
      const blocks = splitStreamBlocks('', true)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].content).toBe('')
      expect(blocks[0].mode).toBe('live')
    })

    it('handles content with only an open code fence', () => {
      const md = '```python'
      const blocks = splitStreamBlocks(md, true)
      expect(blocks.length).toBeGreaterThanOrEqual(1)
    })

    it('handles multiple complete code blocks followed by an open one', () => {
      const md = 'Text\n```js\ncode1\n```\nMiddle\n```py\ncode2'
      const blocks = splitStreamBlocks(md, true)

      // The last code fence is open, so we should split
      expect(blocks.length).toBeGreaterThanOrEqual(2)
    })

    it('handles tilde code fences', () => {
      const md = 'Text\n~~~\ncode here'
      const blocks = splitStreamBlocks(md, true)
      expect(blocks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('block content integrity', () => {
    it('preserves all content across blocks', () => {
      const md = 'Hello\n```js\nconst x = 1'
      const blocks = splitStreamBlocks(md, true)
      const reconstructed = blocks.map(b => b.content).join('')

      // All original content should be represented
      expect(reconstructed).toContain('Hello')
      expect(reconstructed).toContain('const x = 1')
    })

    it('each block has content and mode', () => {
      const blocks = splitStreamBlocks('test', true)
      for (const block of blocks) {
        expect(block).toHaveProperty('content')
        expect(block).toHaveProperty('mode')
        expect(['full', 'live']).toContain(block.mode)
      }
    })
  })
})
