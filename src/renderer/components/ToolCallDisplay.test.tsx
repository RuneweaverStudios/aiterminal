import { describe, it, expect } from 'vitest';
import { renderToolCalls } from './ToolCallDisplay';

describe('renderToolCalls', () => {
  describe('executed commands', () => {
    it('extracts executed run commands', () => {
      const text = '⚡ Executed: `cargo test`\n\nSome analysis text.';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(cleanText).toBe('Some analysis text.');
    });

    it('extracts multiple executed commands', () => {
      const text = '⚡ Executed: `cargo test`\n\n⚡ Executed: `cargo build`\n\nDone.';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(2);
      expect(cleanText).toBe('Done.');
    });

    it('handles text with no tool calls', () => {
      const text = 'Just a normal response with no tool calls.';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(0);
      expect(cleanText).toBe(text);
    });
  });

  describe('file reads', () => {
    it('extracts file read indicators', () => {
      const text = '📄 Read **src/main.rs** — 35 lines, 1KB\n\nThe file contains...';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(cleanText).toBe('The file contains...');
    });
  });

  describe('file writes', () => {
    it('extracts successful write operations', () => {
      const text = '✅ **src/main.rs**\n```diff\n- old\n+ new\n```\n\nFixed.';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(cleanText).toBe('Fixed.');
    });
  });

  describe('errors', () => {
    it('extracts error operations', () => {
      const text = '❌ edit src/main.rs: Search text not found in file\n\nFailed.';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(cleanText).toContain('Failed.');
    });
  });

  describe('mixed operations', () => {
    it('extracts reads, writes, and commands in one message', () => {
      const text = [
        '📄 Read **Cargo.toml** — 20 lines, 1KB',
        '⚡ Executed: `cargo test`',
        '✅ edit src/lib.rs',
        'All tests pass now.',
      ].join('\n\n');
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(2); // read + run (✅ without ** is not matched as write)
      expect(cleanText).toContain('All tests pass now.');
    });

    it('returns empty cleanText when only tool calls', () => {
      const text = '⚡ Executed: `ls -la`';
      const { cleanText, toolCalls } = renderToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(cleanText).toBe('');
    });
  });
});
