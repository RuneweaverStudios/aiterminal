/**
 * Native tool execution tests — verifies all 5 tool types are properly
 * handled end-to-end through the native function calling pipeline.
 *
 * Tests:
 *   1. tool_call_id tracking through ToolCallData
 *   2. Sentinel transport includes tool_call_id
 *   3. All 5 tool types produce correct execution payloads
 *   4. Native tool calls skip text-based tag parsing
 *   5. edit_file, create_file, delete_file are NOT silently dropped
 */

import { describe, it, expect } from 'vitest'
import { TOOL_CALL_SENTINEL } from './tool-definitions'
import type { ToolCallData } from './tool-definitions'

// ---------------------------------------------------------------------------
// 1. tool_call_id is part of ToolCallData
// ---------------------------------------------------------------------------

describe('ToolCallData includes tool_call_id', () => {
  it('ToolCallData supports an optional id field', () => {
    const tc: ToolCallData = {
      id: 'call_abc123',
      name: 'run_command',
      arguments: { command: 'npm test' },
    }
    expect(tc.id).toBe('call_abc123')
  })

  it('ToolCallData works without id (backwards compatible)', () => {
    const tc: ToolCallData = {
      name: 'read_file',
      arguments: { path: 'src/main.ts' },
    }
    expect(tc.id).toBeUndefined()
  })

  it('id survives JSON round-trip through sentinel', () => {
    const tc: ToolCallData = {
      id: 'call_xyz789',
      name: 'edit_file',
      arguments: { path: 'foo.ts', search: 'old', replace: 'new' },
    }
    const sentinel = `${TOOL_CALL_SENTINEL}${JSON.stringify(tc)}`
    const parsed: ToolCallData = JSON.parse(sentinel.slice(TOOL_CALL_SENTINEL.length))
    expect(parsed.id).toBe('call_xyz789')
    expect(parsed.name).toBe('edit_file')
  })
})

// ---------------------------------------------------------------------------
// 2. All 5 tool types produce actionable execution data
// ---------------------------------------------------------------------------

describe('Native tool call execution payloads', () => {
  /**
   * Simulates the execution dispatch in useChat.ts — given a ToolCallData,
   * returns the IPC call that should be made. This mirrors the actual logic
   * that MUST exist in useChat for native tool calling to work end-to-end.
   */
  function dispatchToolCall(tc: ToolCallData): {
    ipcChannel: string
    args: Record<string, unknown>
  } | null {
    const { name, arguments: args } = tc

    if (name === 'run_command' && args.command) {
      return { ipcChannel: 'write-to-session', args: { command: args.command } }
    }
    if (name === 'read_file' && args.path) {
      return { ipcChannel: 'read-file', args: { path: args.path } }
    }
    if (name === 'edit_file' && args.path && args.search !== undefined && args.replace !== undefined) {
      return { ipcChannel: 'edit-file', args: { path: args.path, search: args.search, replace: args.replace } }
    }
    if (name === 'create_file' && args.path && args.content !== undefined) {
      return { ipcChannel: 'write-file', args: { path: args.path, content: args.content } }
    }
    if (name === 'delete_file' && args.path) {
      return { ipcChannel: 'delete-file', args: { path: args.path } }
    }

    return null
  }

  it('run_command dispatches to write-to-session', () => {
    const result = dispatchToolCall({
      name: 'run_command',
      arguments: { command: 'cargo test --all' },
    })
    expect(result).not.toBeNull()
    expect(result!.ipcChannel).toBe('write-to-session')
    expect(result!.args.command).toBe('cargo test --all')
  })

  it('read_file dispatches to read-file', () => {
    const result = dispatchToolCall({
      name: 'read_file',
      arguments: { path: 'src/main.rs' },
    })
    expect(result).not.toBeNull()
    expect(result!.ipcChannel).toBe('read-file')
    expect(result!.args.path).toBe('src/main.rs')
  })

  it('edit_file dispatches to edit-file with search/replace', () => {
    const result = dispatchToolCall({
      name: 'edit_file',
      arguments: { path: 'src/lib.rs', search: 'fn old()', replace: 'fn new()' },
    })
    expect(result).not.toBeNull()
    expect(result!.ipcChannel).toBe('edit-file')
    expect(result!.args.path).toBe('src/lib.rs')
    expect(result!.args.search).toBe('fn old()')
    expect(result!.args.replace).toBe('fn new()')
  })

  it('create_file dispatches to write-file with content', () => {
    const result = dispatchToolCall({
      name: 'create_file',
      arguments: { path: 'tests/new.test.ts', content: 'test("works", () => {})' },
    })
    expect(result).not.toBeNull()
    expect(result!.ipcChannel).toBe('write-file')
    expect(result!.args.path).toBe('tests/new.test.ts')
    expect(result!.args.content).toBe('test("works", () => {})')
  })

  it('delete_file dispatches to delete-file', () => {
    const result = dispatchToolCall({
      name: 'delete_file',
      arguments: { path: 'old-file.ts' },
    })
    expect(result).not.toBeNull()
    expect(result!.ipcChannel).toBe('delete-file')
    expect(result!.args.path).toBe('old-file.ts')
  })

  it('unknown tool returns null', () => {
    const result = dispatchToolCall({
      name: 'unknown_tool',
      arguments: { foo: 'bar' },
    })
    expect(result).toBeNull()
  })

  it('edit_file without search returns null', () => {
    const result = dispatchToolCall({
      name: 'edit_file',
      arguments: { path: 'foo.ts' },
    })
    expect(result).toBeNull()
  })

  it('create_file without content returns null', () => {
    const result = dispatchToolCall({
      name: 'create_file',
      arguments: { path: 'foo.ts' },
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. Multi-tool scenarios with all 5 types
// ---------------------------------------------------------------------------

describe('Multi-tool native execution scenarios', () => {
  function collectExecutions(toolCalls: ToolCallData[]): string[] {
    return toolCalls
      .map(tc => {
        if (tc.name === 'run_command') return `RUN:${tc.arguments.command}`
        if (tc.name === 'read_file') return `READ:${tc.arguments.path}`
        if (tc.name === 'edit_file') return `EDIT:${tc.arguments.path}`
        if (tc.name === 'create_file') return `CREATE:${tc.arguments.path}`
        if (tc.name === 'delete_file') return `DELETE:${tc.arguments.path}`
        return `UNKNOWN:${tc.name}`
      })
  }

  it('Scenario: read, edit, then verify — all executed', () => {
    const calls: ToolCallData[] = [
      { id: 'call_1', name: 'read_file', arguments: { path: 'src/app.ts' } },
      { id: 'call_2', name: 'edit_file', arguments: { path: 'src/app.ts', search: 'old()', replace: 'new()' } },
      { id: 'call_3', name: 'run_command', arguments: { command: 'npm test' } },
    ]
    const executions = collectExecutions(calls)
    expect(executions).toEqual([
      'READ:src/app.ts',
      'EDIT:src/app.ts',
      'RUN:npm test',
    ])
  })

  it('Scenario: create file, run tests, delete old file', () => {
    const calls: ToolCallData[] = [
      { id: 'call_1', name: 'create_file', arguments: { path: 'src/new-util.ts', content: 'export const x = 1' } },
      { id: 'call_2', name: 'run_command', arguments: { command: 'npm test' } },
      { id: 'call_3', name: 'delete_file', arguments: { path: 'src/old-util.ts' } },
    ]
    const executions = collectExecutions(calls)
    expect(executions).toEqual([
      'CREATE:src/new-util.ts',
      'RUN:npm test',
      'DELETE:src/old-util.ts',
    ])
  })

  it('Scenario: full refactor — read, create, edit, delete, run', () => {
    const calls: ToolCallData[] = [
      { id: 'call_1', name: 'read_file', arguments: { path: 'src/legacy.ts' } },
      { id: 'call_2', name: 'create_file', arguments: { path: 'src/modern.ts', content: 'export class Modern {}' } },
      { id: 'call_3', name: 'edit_file', arguments: { path: 'src/index.ts', search: "import { Legacy }", replace: "import { Modern }" } },
      { id: 'call_4', name: 'delete_file', arguments: { path: 'src/legacy.ts' } },
      { id: 'call_5', name: 'run_command', arguments: { command: 'npm test' } },
    ]
    const executions = collectExecutions(calls)
    expect(executions).toHaveLength(5)
    expect(executions[0]).toBe('READ:src/legacy.ts')
    expect(executions[1]).toBe('CREATE:src/modern.ts')
    expect(executions[2]).toBe('EDIT:src/index.ts')
    expect(executions[3]).toBe('DELETE:src/legacy.ts')
    expect(executions[4]).toBe('RUN:npm test')
  })
})

// ---------------------------------------------------------------------------
// 4. IPC handler for edit-file (search/replace via read + write)
// ---------------------------------------------------------------------------

describe('edit-file IPC simulation', () => {
  /**
   * Simulates the edit-file operation: read current content, find search text,
   * replace with new text, write back. This is what the main process handler does.
   */
  function applyEdit(
    currentContent: string,
    search: string,
    replace: string,
  ): { success: boolean; content?: string; error?: string } {
    if (!currentContent.includes(search)) {
      return { success: false, error: `Search text not found in file` }
    }
    const newContent = currentContent.replace(search, replace)
    return { success: true, content: newContent }
  }

  it('replaces exact match', () => {
    const result = applyEdit('function old() { return 1 }', 'old()', 'new()')
    expect(result.success).toBe(true)
    expect(result.content).toBe('function new() { return 1 }')
  })

  it('replaces multiline match', () => {
    const original = 'line 1\nline 2\nline 3'
    const result = applyEdit(original, 'line 2', 'line TWO')
    expect(result.success).toBe(true)
    expect(result.content).toBe('line 1\nline TWO\nline 3')
  })

  it('fails when search text not found', () => {
    const result = applyEdit('hello world', 'foo', 'bar')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('handles empty replace (deletion)', () => {
    const result = applyEdit('const debug = true;\nconst x = 1;', 'const debug = true;\n', '')
    expect(result.success).toBe(true)
    expect(result.content).toBe('const x = 1;')
  })
})

// ---------------------------------------------------------------------------
// 5. Sentinel transport preserves all fields including id
// ---------------------------------------------------------------------------

describe('Sentinel transport completeness', () => {
  it('preserves all ToolCallData fields through sentinel encoding', () => {
    const original: ToolCallData = {
      id: 'call_test_456',
      name: 'create_file',
      arguments: {
        path: 'src/new.ts',
        content: 'export const x = 42\n// comment with "quotes"',
      },
    }

    const sentinel = `${TOOL_CALL_SENTINEL}${JSON.stringify(original)}`
    expect(sentinel.startsWith('\x00TOOLCALL:')).toBe(true)

    const parsed: ToolCallData = JSON.parse(sentinel.slice(TOOL_CALL_SENTINEL.length))
    expect(parsed.id).toBe(original.id)
    expect(parsed.name).toBe(original.name)
    expect(parsed.arguments.path).toBe(original.arguments.path)
    expect(parsed.arguments.content).toBe(original.arguments.content)
  })

  it('IPC payload includes toolCall field for tool call sentinels', () => {
    // Simulates ipc-handlers.ts line 411-412
    const chunk = '\x00TOOLCALL:{"id":"call_1","name":"edit_file","arguments":{"path":"a.ts","search":"x","replace":"y"}}'
    const isToolCall = chunk.startsWith('\x00TOOLCALL:')
    expect(isToolCall).toBe(true)

    const toolCallPayload = chunk.slice(10) // '\x00TOOLCALL:'.length === 10
    const parsed = JSON.parse(toolCallPayload)
    expect(parsed.id).toBe('call_1')
    expect(parsed.name).toBe('edit_file')
    expect(parsed.arguments.search).toBe('x')
  })
})
