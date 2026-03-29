/**
 * Streaming markdown block splitter.
 *
 * During streaming, the AI response may end mid-code-fence. This module
 * splits the streaming text into blocks so the markdown renderer can:
 * - Render completed blocks as full markdown (cached, no re-parse)
 * - Render the in-progress tail as live markdown (healed, re-parsed each chunk)
 *
 * Inspired by OpenCode's markdown-stream.ts pattern.
 */

export interface StreamBlock {
  readonly content: string
  readonly mode: 'full' | 'live'
}

/**
 * Split streaming text into renderable blocks.
 *
 * @param text - The accumulated streaming text
 * @param live - Whether the text is still streaming
 * @returns Array of blocks with mode 'full' (complete) or 'live' (in-progress)
 */
export function splitStreamBlocks(text: string, live: boolean): readonly StreamBlock[] {
  // Non-streaming: everything is one full block
  if (!live) {
    return [{ content: text, mode: 'full' }]
  }

  // Streaming: check for open code fence at the tail
  // Use a simple scan to find the last code fence
  const lines = text.split('\n')
  let lastFenceStart = -1
  let inFence = false
  let fenceChar = ''
  let fenceSize = 0
  let lineOffset = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart()
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/)

    if (fenceMatch) {
      const char = fenceMatch[1][0]
      const size = fenceMatch[1].length

      if (!inFence) {
        inFence = true
        fenceChar = char
        fenceSize = size
        lastFenceStart = lineOffset
      } else if (char === fenceChar && size >= fenceSize) {
        // Check it's a closing fence (just the fence chars, optional whitespace)
        const closePattern = new RegExp(`^${char === '`' ? '`' : '~'}{${fenceSize},}\\s*$`)
        if (closePattern.test(trimmed)) {
          inFence = false
          lastFenceStart = -1
        }
      }
    }

    lineOffset += lines[i].length + 1 // +1 for newline
  }

  // If no open fence, return single live block
  if (!inFence || lastFenceStart <= 0) {
    return [{ content: text, mode: 'live' }]
  }

  // Split at the open fence boundary
  const head = text.slice(0, lastFenceStart)
  const tail = text.slice(lastFenceStart)

  const blocks: StreamBlock[] = []

  if (head.trim()) {
    blocks.push({ content: head, mode: 'live' })
  }

  blocks.push({ content: tail, mode: 'live' })

  return blocks
}
