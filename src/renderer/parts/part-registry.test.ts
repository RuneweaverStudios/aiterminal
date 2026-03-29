import { describe, it, expect, beforeEach } from 'vitest'
import {
  PartRegistry,
  type PartComponent,
  type MessagePartV2,
} from './part-registry'

describe('PartRegistry', () => {
  let registry: PartRegistry

  beforeEach(() => {
    registry = new PartRegistry()
  })

  it('starts with no registered parts', () => {
    expect(registry.get('text')).toBeUndefined()
  })

  it('registers and retrieves a part component', () => {
    const mockComponent: PartComponent = () => null
    registry.register('text', mockComponent)

    expect(registry.get('text')).toBe(mockComponent)
  })

  it('overwrites existing registration', () => {
    const first: PartComponent = () => null
    const second: PartComponent = () => null

    registry.register('text', first)
    registry.register('text', second)

    expect(registry.get('text')).toBe(second)
  })

  it('returns undefined for unregistered types', () => {
    expect(registry.get('unknown-type')).toBeUndefined()
  })

  it('lists all registered type names', () => {
    registry.register('text', () => null)
    registry.register('tool', () => null)
    registry.register('reasoning', () => null)

    const types = registry.types()
    expect(types).toContain('text')
    expect(types).toContain('tool')
    expect(types).toContain('reasoning')
    expect(types).toHaveLength(3)
  })

  it('has() returns true for registered types', () => {
    registry.register('text', () => null)
    expect(registry.has('text')).toBe(true)
    expect(registry.has('tool')).toBe(false)
  })
})
