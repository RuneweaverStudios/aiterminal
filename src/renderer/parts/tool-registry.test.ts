import { describe, it, expect, beforeEach } from 'vitest'
import {
  ToolRegistry,
  type ToolRenderer,
} from './tool-registry'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  it('starts with no registered tools', () => {
    expect(registry.get('bash')).toBeUndefined()
  })

  it('registers and retrieves a tool renderer', () => {
    const renderer: ToolRenderer = { name: 'bash', render: () => null }
    registry.register(renderer)

    expect(registry.get('bash')).toBe(renderer)
  })

  it('overwrites existing tool registration', () => {
    const first: ToolRenderer = { name: 'bash', render: () => null }
    const second: ToolRenderer = { name: 'bash', render: () => null }

    registry.register(first)
    registry.register(second)

    expect(registry.get('bash')).toBe(second)
  })

  it('registers multiple different tools', () => {
    const bash: ToolRenderer = { name: 'bash', render: () => null }
    const edit: ToolRenderer = { name: 'edit', render: () => null }
    const read: ToolRenderer = { name: 'read', render: () => null }

    registry.register(bash)
    registry.register(edit)
    registry.register(read)

    expect(registry.get('bash')).toBe(bash)
    expect(registry.get('edit')).toBe(edit)
    expect(registry.get('read')).toBe(read)
  })

  it('lists all registered tool names', () => {
    registry.register({ name: 'bash', render: () => null })
    registry.register({ name: 'edit', render: () => null })

    const names = registry.names()
    expect(names).toContain('bash')
    expect(names).toContain('edit')
    expect(names).toHaveLength(2)
  })

  it('has() returns true for registered tools', () => {
    registry.register({ name: 'bash', render: () => null })
    expect(registry.has('bash')).toBe(true)
    expect(registry.has('edit')).toBe(false)
  })
})
