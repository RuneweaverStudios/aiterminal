/**
 * BlockCache — LRU cache for rendered markdown blocks.
 *
 * Completed (full mode) blocks are cached so they're never re-parsed.
 * Live (streaming) blocks are always re-rendered.
 *
 * Inspired by OpenCode's block caching pattern in markdown.tsx.
 */

export class BlockCache {
  private readonly cache = new Map<string, string>()
  private readonly maxSize: number

  constructor(maxSize = 500) {
    this.maxSize = maxSize
  }

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) {
        this.cache.delete(oldest)
      }
    }
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Only cache blocks in 'full' mode — live blocks are always re-rendered.
   */
  setIfFull(blockId: string, mode: 'full' | 'live', html: string): void {
    if (mode === 'full') {
      this.set(`${blockId}-${mode}`, html)
    }
  }

  size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}
