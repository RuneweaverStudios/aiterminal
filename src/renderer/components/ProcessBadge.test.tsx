import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProcessBadge, BADGE_COLORS } from './ProcessBadge'

describe('ProcessBadge', () => {
  it('renders badge text', () => {
    render(<ProcessBadge type="read" />)
    expect(screen.getByText('READ')).toBeInTheDocument()
  })

  it('renders 3-letter code for bash', () => {
    render(<ProcessBadge type="bash" />)
    expect(screen.getByText('RUN')).toBeInTheDocument()
  })

  it('renders 3-letter code for edit', () => {
    render(<ProcessBadge type="edit" />)
    expect(screen.getByText('EDT')).toBeInTheDocument()
  })

  it('renders 3-letter code for write', () => {
    render(<ProcessBadge type="write" />)
    expect(screen.getByText('WRT')).toBeInTheDocument()
  })

  it('renders 3-letter code for grep', () => {
    render(<ProcessBadge type="grep" />)
    expect(screen.getByText('SRC')).toBeInTheDocument()
  })

  it('renders 3-letter code for thinking', () => {
    render(<ProcessBadge type="thinking" />)
    expect(screen.getByText('GEN')).toBeInTheDocument()
  })

  it('renders ERR for error type', () => {
    render(<ProcessBadge type="error" />)
    expect(screen.getByText('ERR')).toBeInTheDocument()
  })

  it('applies --step-accent CSS variable', () => {
    const { container } = render(<ProcessBadge type="bash" />)
    const badge = container.querySelector('.process-badge')
    const style = badge?.getAttribute('style')
    expect(style).toContain('--step-accent')
  })

  it('has correct color for bash type', () => {
    const { container } = render(<ProcessBadge type="bash" />)
    const badge = container.querySelector('.process-badge')
    const style = badge?.getAttribute('style')
    expect(style).toContain(BADGE_COLORS.bash)
  })

  it('falls back to default color for unknown type', () => {
    render(<ProcessBadge type="unknown-tool" />)
    const badge = document.querySelector('.process-badge')
    expect(badge).toBeInTheDocument()
  })
})
