/**
 * PartRegistry — pluggable registry mapping message part types to React components.
 *
 * Inspired by OpenCode's PART_MAPPING pattern. Instead of a giant switch/case,
 * part types are registered dynamically, making the system extensible.
 */

import type { FC } from 'react'

export interface MessagePartV2 {
  readonly type: string
  readonly [key: string]: unknown
}

export type PartComponent = FC<{ part: MessagePartV2 }>

export class PartRegistry {
  private readonly components = new Map<string, PartComponent>()

  register(type: string, component: PartComponent): void {
    this.components.set(type, component)
  }

  get(type: string): PartComponent | undefined {
    return this.components.get(type)
  }

  has(type: string): boolean {
    return this.components.has(type)
  }

  types(): readonly string[] {
    return [...this.components.keys()]
  }
}
