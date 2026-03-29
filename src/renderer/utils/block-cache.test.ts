import { describe, it, expect } from 'vitest'
import { BlockCache } from './block-cache'

describe('BlockCache', () => {
  it('starts with zero entries', () => {
    const cache = new BlockCache()
    expect(cache.size()).toBe(0)
  })

  it('stores and retrieves a cached value', () => {
    const cache = new BlockCache()
    cache.set('block-0-full', '<p>Hello</p>')

    expect(cache.get('block-0-full')).toBe('<p>Hello</p>')
  })

  it('returns undefined for missing keys', () => {
    const cache = new BlockCache()
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('has() returns true for cached keys', () => {
    const cache = new BlockCache()
    cache.set('key1', 'value1')

    expect(cache.has('key1')).toBe(true)
    expect(cache.has('key2')).toBe(false)
  })

  it('overwrites existing keys', () => {
    const cache = new BlockCache()
    cache.set('k', 'old')
    cache.set('k', 'new')

    expect(cache.get('k')).toBe('new')
    expect(cache.size()).toBe(1)
  })

  it('does not cache live mode blocks', () => {
    const cache = new BlockCache()
    cache.setIfFull('block-0', 'live', '<p>streaming</p>')

    expect(cache.has('block-0-live')).toBe(false)
    expect(cache.size()).toBe(0)
  })

  it('caches full mode blocks', () => {
    const cache = new BlockCache()
    cache.setIfFull('block-0', 'full', '<p>done</p>')

    expect(cache.get('block-0-full')).toBe('<p>done</p>')
  })

  it('evicts oldest entries when exceeding max size', () => {
    const cache = new BlockCache(3)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.set('d', '4')

    expect(cache.has('a')).toBe(false) // evicted
    expect(cache.has('d')).toBe(true)  // newest
    expect(cache.size()).toBe(3)
  })

  it('clear() removes all entries', () => {
    const cache = new BlockCache()
    cache.set('a', '1')
    cache.set('b', '2')
    cache.clear()

    expect(cache.size()).toBe(0)
    expect(cache.has('a')).toBe(false)
  })

  it('generates correct cache key from block index and mode', () => {
    const cache = new BlockCache()
    cache.setIfFull('block-5', 'full', 'data')
    expect(cache.get('block-5-full')).toBe('data')
  })
})
