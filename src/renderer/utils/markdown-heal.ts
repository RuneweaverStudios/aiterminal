/**
 * Heal broken markdown that occurs during streaming.
 *
 * When AI text arrives mid-stream, formatting markers may be unclosed:
 * - **bold without close
 * - *italic without close
 * - `inline code without close
 * - [links without close
 * - ```code fences without close
 * - ~~strikethrough without close
 *
 * This function closes them so the markdown parser produces valid output.
 * Inspired by the `remend` library used in OpenCode.
 */

export function healMarkdown(text: string): string {
  if (!text) return ''

  // First, identify code fences — don't touch formatting inside them
  const lines = text.split('\n')
  let inCodeFence = false
  let codeFenceChar = ''
  let codeFenceSize = 0
  const codeRanges: Array<{ start: number; end: number }> = []
  let pos = 0

  for (const line of lines) {
    const trimmed = line.trimStart()
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/)

    if (fenceMatch) {
      const char = fenceMatch[1][0]
      const size = fenceMatch[1].length

      if (!inCodeFence) {
        inCodeFence = true
        codeFenceChar = char
        codeFenceSize = size
        codeRanges.push({ start: pos, end: -1 })
      } else if (char === codeFenceChar && size >= codeFenceSize) {
        inCodeFence = false
        codeRanges[codeRanges.length - 1].end = pos + line.length
      }
    }

    pos += line.length + 1 // +1 for newline
  }

  // If code fence is still open, close it
  if (inCodeFence) {
    const fence = codeFenceChar.repeat(codeFenceSize)
    text = text + '\n' + fence
    if (codeRanges.length > 0) {
      codeRanges[codeRanges.length - 1].end = text.length
    }
  }

  // Now heal inline formatting outside code fences
  const isInCodeFence = (index: number): boolean => {
    return codeRanges.some(r => index >= r.start && index < r.end)
  }

  // Track open markers
  let boldOpen = false
  let italicOpen = false
  let codeOpen = false
  let strikeOpen = false
  let bracketOpen = false
  let parenOpen = false

  let i = 0
  while (i < text.length) {
    if (isInCodeFence(i)) {
      i++
      continue
    }

    // Handle runs of asterisks as a group to avoid mis-parsing ***
    if (text[i] === '*') {
      let runLen = 0
      while (text[i + runLen] === '*') runLen++

      if (runLen >= 3) {
        // *** toggles both bold and italic
        boldOpen = !boldOpen
        italicOpen = !italicOpen
        i += runLen
        continue
      }
      if (runLen === 2) {
        boldOpen = !boldOpen
        i += 2
        continue
      }
      // runLen === 1
      italicOpen = !italicOpen
      i++
      continue
    }

    // Check for ~~
    if (text[i] === '~' && text[i + 1] === '~') {
      strikeOpen = !strikeOpen
      i += 2
      continue
    }

    // Check for `
    if (text[i] === '`' && text[i + 1] !== '`') {
      codeOpen = !codeOpen
      i++
      continue
    }

    // Check for [
    if (text[i] === '[' && !codeOpen) {
      bracketOpen = true
      i++
      continue
    }

    // Check for ]
    if (text[i] === ']' && bracketOpen) {
      bracketOpen = false
      // Check for (
      if (text[i + 1] === '(') {
        parenOpen = true
        i += 2
        continue
      }
      i++
      continue
    }

    // Check for ) closing a link
    if (text[i] === ')' && parenOpen) {
      parenOpen = false
      i++
      continue
    }

    i++
  }

  // Close any unclosed markers (in reverse order of opening)
  const suffixes: string[] = []

  if (parenOpen) {
    suffixes.push(')')
  }
  if (bracketOpen) {
    suffixes.push(']')
  }
  if (codeOpen) {
    suffixes.push('`')
  }
  if (italicOpen) {
    suffixes.push('*')
  }
  if (boldOpen) {
    suffixes.push('**')
  }
  if (strikeOpen) {
    suffixes.push('~~')
  }

  return text + suffixes.join('')
}
