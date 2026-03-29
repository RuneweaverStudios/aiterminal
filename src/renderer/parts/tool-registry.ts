/**
 * ToolRegistry — pluggable registry for tool-specific renderers.
 *
 * Each tool type (bash, read, edit, write, etc.) can register its own
 * renderer. Unknown tools fall back to a generic display.
 *
 * Inspired by OpenCode's ToolRegistry.register() pattern.
 */

import type { FC } from 'react'

export interface ToolRenderProps {
  readonly tool: string
  readonly status: 'pending' | 'running' | 'done' | 'error'
  readonly path?: string
  readonly command?: string
  readonly output?: string
  readonly error?: string
  readonly [key: string]: unknown
}

export interface ToolRenderer {
  readonly name: string
  readonly render: FC<ToolRenderProps>
}

export class ToolRegistry {
  private readonly renderers = new Map<string, ToolRenderer>()

  register(renderer: ToolRenderer): void {
    this.renderers.set(renderer.name, renderer)
  }

  get(name: string): ToolRenderer | undefined {
    return this.renderers.get(name)
  }

  has(name: string): boolean {
    return this.renderers.has(name)
  }

  names(): readonly string[] {
    return [...this.renderers.keys()]
  }
}
