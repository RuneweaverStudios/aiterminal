import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StreamingMarkdown } from './StreamingMarkdown'

describe('StreamingMarkdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders plain text content', () => {
    render(
      <StreamingMarkdown
        content="Hello world"
        isStreaming={false}
      />,
    )

    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders markdown bold as strong element', () => {
    render(
      <StreamingMarkdown
        content="Hello **bold** text"
        isStreaming={false}
      />,
    )

    const strong = document.querySelector('strong')
    expect(strong).toBeInTheDocument()
    expect(strong?.textContent).toBe('bold')
  })

  it('renders code blocks with pre/code elements', () => {
    render(
      <StreamingMarkdown
        content={'Some text\n```js\nconst x = 1\n```'}
        isStreaming={false}
      />,
    )

    const codeBlock = document.querySelector('pre code')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock?.textContent).toContain('const x = 1')
  })

  it('shows blinking cursor while streaming', () => {
    const { container } = render(
      <StreamingMarkdown
        content="Streaming text"
        isStreaming={true}
      />,
    )

    const cursor = container.querySelector('.streaming-markdown__cursor')
    expect(cursor).toBeInTheDocument()
  })

  it('hides cursor when not streaming', () => {
    const { container } = render(
      <StreamingMarkdown
        content="Done"
        isStreaming={false}
      />,
    )

    const cursor = container.querySelector('.streaming-markdown__cursor')
    expect(cursor).not.toBeInTheDocument()
  })

  it('renders inline code', () => {
    render(
      <StreamingMarkdown
        content="Use the `forEach` method"
        isStreaming={false}
      />,
    )

    const inlineCode = document.querySelector('code')
    expect(inlineCode).toBeInTheDocument()
    expect(inlineCode?.textContent).toBe('forEach')
  })

  it('renders links', () => {
    render(
      <StreamingMarkdown
        content="Visit [example](https://example.com)"
        isStreaming={false}
      />,
    )

    const link = document.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link?.getAttribute('href')).toBe('https://example.com')
  })

  it('renders unordered lists', () => {
    render(
      <StreamingMarkdown
        content={"Here is a list:\n\n- Item 1\n- Item 2\n- Item 3\n"}
        isStreaming={false}
      />,
    )

    const items = document.querySelectorAll('li')
    expect(items.length).toBe(3)
  })

  it('handles empty content', () => {
    const { container } = render(
      <StreamingMarkdown
        content=""
        isStreaming={false}
      />,
    )

    expect(container.querySelector('.streaming-markdown')).toBeInTheDocument()
  })

  it('applies streaming-markdown class to root element', () => {
    const { container } = render(
      <StreamingMarkdown
        content="Test"
        isStreaming={false}
      />,
    )

    expect(container.querySelector('.streaming-markdown')).toBeInTheDocument()
  })

  it('handles broken markdown gracefully during streaming', () => {
    // Open bold without close — should not crash
    const { container } = render(
      <StreamingMarkdown
        content="Hello **bold text without close"
        isStreaming={true}
      />,
    )

    expect(container.querySelector('.streaming-markdown')).toBeInTheDocument()
  })

  it('handles open code fence during streaming', () => {
    const { container } = render(
      <StreamingMarkdown
        content={'```js\nconst x = 1'}
        isStreaming={true}
      />,
    )

    // Should render the code content even though fence is unclosed
    expect(container.querySelector('.streaming-markdown')).toBeInTheDocument()
    expect(container.textContent).toContain('const x = 1')
  })

  it('renders code blocks with copy button when not streaming', () => {
    const { container } = render(
      <StreamingMarkdown
        content={'```\nsome code\n```'}
        isStreaming={false}
      />,
    )

    const copyBtn = container.querySelector('.code-block__copy')
    expect(copyBtn).toBeInTheDocument()
  })
})
