import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextShimmer } from './TextShimmer'

describe('TextShimmer', () => {
  it('renders text content', () => {
    render(<TextShimmer text="Thinking..." active={true} />)
    // Two copies: base + shimmer
    const matches = screen.getAllByText('Thinking...')
    expect(matches.length).toBe(2)
  })

  it('applies active class when active', () => {
    const { container } = render(<TextShimmer text="Loading" active={true} />)
    const el = container.querySelector('.text-shimmer')
    expect(el?.classList.contains('text-shimmer--active')).toBe(true)
  })

  it('removes active class when inactive', () => {
    const { container } = render(<TextShimmer text="Done" active={false} />)
    const el = container.querySelector('.text-shimmer')
    expect(el?.classList.contains('text-shimmer--active')).toBe(false)
  })

  it('has base layer and shimmer layer', () => {
    const { container } = render(<TextShimmer text="Loading" active={true} />)
    const base = container.querySelector('.text-shimmer__base')
    const shimmer = container.querySelector('.text-shimmer__shimmer')

    expect(base).toBeInTheDocument()
    expect(shimmer).toBeInTheDocument()
  })

  it('both layers contain the same text', () => {
    const { container } = render(<TextShimmer text="Processing" active={true} />)
    const base = container.querySelector('.text-shimmer__base')
    const shimmer = container.querySelector('.text-shimmer__shimmer')

    expect(base?.textContent).toBe('Processing')
    expect(shimmer?.textContent).toBe('Processing')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <TextShimmer text="Test" active={true} className="custom" />,
    )
    const el = container.querySelector('.text-shimmer')
    expect(el?.classList.contains('custom')).toBe(true)
  })
})
