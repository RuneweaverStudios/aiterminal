/**
 * StreamingMarkdown — renders AI response with proper markdown during streaming.
 *
 * Replaces the old StreamingText component with:
 * - Proper markdown rendering via react-markdown
 * - Streaming-safe block splitting (code fences don't break)
 * - Markdown healing for unclosed formatting
 * - Copy button on code blocks
 * - Blinking cursor while streaming
 */

import { type FC, useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { splitStreamBlocks } from '../utils/markdown-stream'
import { healMarkdown } from '../utils/markdown-heal'

export interface StreamingMarkdownProps {
  readonly content: string
  readonly isStreaming: boolean
  readonly className?: string
}

export const StreamingMarkdown: FC<StreamingMarkdownProps> = ({
  content,
  isStreaming,
  className,
}) => {
  const blocks = useMemo(
    () => splitStreamBlocks(content, isStreaming),
    [content, isStreaming],
  )

  // Heal the live blocks for display
  const healedContent = useMemo(() => {
    return blocks
      .map(block => block.mode === 'live' ? healMarkdown(block.content) : block.content)
      .join('')
  }, [blocks])

  return (
    <div className={`streaming-markdown ${className ?? ''}`}>
      <div className="streaming-markdown__content">
        <ReactMarkdown
          disallowedElements={['p']}
          unwrapDisallowed
          components={{
            code({ inline, className: codeClassName, children, ...props }: any) {
              if (inline) {
                return (
                  <code className="streaming-markdown__inline-code" {...props}>
                    {children}
                  </code>
                )
              }
              return (
                <div className="streaming-markdown__code-wrapper">
                  {!isStreaming && (
                    <CopyButton content={String(children).replace(/\n$/, '')} />
                  )}
                  <pre>
                    <code className={codeClassName} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              )
            },
          }}
        >
          {healedContent}
        </ReactMarkdown>
      </div>

      {isStreaming && (
        <span className="streaming-markdown__cursor">{'\u2588'}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy button for code blocks
// ---------------------------------------------------------------------------

const CopyButton: FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [content])

  return (
    <button
      className="code-block__copy"
      onClick={handleCopy}
      title="Copy code"
      type="button"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}
