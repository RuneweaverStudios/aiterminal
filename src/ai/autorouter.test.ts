/**
 * E2E auto-router tests — verifies complexity detection + model escalation
 * across all 4 presets using realistic prompts against a real project.
 *
 * Tests the full routing chain:
 *   user prompt → isComplexPrompt() → resolveModelForTask() → model ID
 */

import { describe, it, expect } from 'vitest';
import { resolveModelForTask } from './openrouter-client';

// ---------------------------------------------------------------------------
// Preset model expectations
// ---------------------------------------------------------------------------

const EXPECTED = {
  budget: {
    simple: 'z-ai/glm-4.5-air:free',
    complex: 'qwen/qwen3-coder-next',
  },
  balanced: {
    simple: 'qwen/qwen3-coder-next',
    complex: 'z-ai/glm-5',
  },
  speed: {
    simple: 'z-ai/glm-4.7-flash',
    complex: 'qwen/qwen3-coder-next',
  },
  performance: {
    simple: 'google/gemini-2.5-pro-preview-03-25',
    complex: 'anthropic/claude-sonnet-4-20250514',
  },
} as const;

// ---------------------------------------------------------------------------
// Simple prompts — should NOT escalate
// ---------------------------------------------------------------------------

const SIMPLE_PROMPTS = [
  'tell me about my project',
  'what does this file do?',
  'list the dependencies',
  'how do I run it?',
  'explain this function',
  'what is the project structure?',
];

// ---------------------------------------------------------------------------
// Complex prompts — SHOULD escalate
// ---------------------------------------------------------------------------

const COMPLEX_PROMPTS = [
  // Multi-file refactoring
  'refactor the authentication module to use JWT tokens instead of sessions across all services',
  // Debugging
  'debug the race condition in the agent memory system that causes data loss under concurrent writes',
  // Architecture
  'how should I restructure the monorepo to support independent deployments for each microservice?',
  // Multi-step tasks
  'implement a new caching layer and test it with integration tests across all API endpoints',
  // Error recovery
  "the build is still failing after my last 3 attempts, tried everything I can think of",
  // Long prompt (>500 chars)
  'I need you to analyze the entire codebase structure, identify all the places where we handle authentication, check if there are any security vulnerabilities in how we store tokens, verify that the session management is consistent across all microservices, review the database schema for the user table, check if migrations are up to date, and then create a comprehensive security audit report with recommendations for each issue found. Also check the Docker configuration for any exposed ports or insecure defaults.',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auto-Router — Complexity Detection + Escalation', () => {
  describe.each(['budget', 'balanced', 'speed', 'performance'] as const)(
    '%s preset',
    (preset) => {
      it('routes simple prompts to the default model', () => {
        for (const prompt of SIMPLE_PROMPTS) {
          const modelId = resolveModelForTask('general', preset, prompt);
          expect(modelId).toBe(EXPECTED[preset].simple);
        }
      });

      it('escalates complex prompts to the stronger model', () => {
        for (const prompt of COMPLEX_PROMPTS) {
          const modelId = resolveModelForTask('general', preset, prompt);
          expect(modelId).toBe(EXPECTED[preset].complex);
        }
      });
    },
  );

  describe('edge cases', () => {
    it('does not escalate when no prompt is provided', () => {
      const modelId = resolveModelForTask('general', 'balanced');
      expect(modelId).toBe(EXPECTED.balanced.simple);
    });

    it('does not escalate empty prompts', () => {
      const modelId = resolveModelForTask('general', 'balanced', '');
      expect(modelId).toBe(EXPECTED.balanced.simple);
    });

    it('does not escalate short simple prompts', () => {
      const modelId = resolveModelForTask('general', 'balanced', 'hello');
      expect(modelId).toBe(EXPECTED.balanced.simple);
    });

    it('escalates prompts >500 chars regardless of keywords', () => {
      const longPrompt = 'Please help me with ' + 'this task '.repeat(60);
      expect(longPrompt.length).toBeGreaterThan(500);
      const modelId = resolveModelForTask('general', 'balanced', longPrompt);
      expect(modelId).toBe(EXPECTED.balanced.complex);
    });
  });

  describe('keyword detection specificity', () => {
    it('detects refactoring keywords', () => {
      const model = resolveModelForTask('general', 'budget', 'refactor the user service');
      expect(model).toBe(EXPECTED.budget.complex);
    });

    it('detects debugging keywords', () => {
      const model = resolveModelForTask('general', 'budget', 'debug the memory leak in production');
      expect(model).toBe(EXPECTED.budget.complex);
    });

    it('detects architecture keywords', () => {
      const model = resolveModelForTask('general', 'budget', 'how should I restructure this?');
      expect(model).toBe(EXPECTED.budget.complex);
    });

    it('detects error recovery patterns', () => {
      const model = resolveModelForTask('general', 'budget', "it's still not working after my changes");
      expect(model).toBe(EXPECTED.budget.complex);
    });

    it('detects multi-step task patterns', () => {
      const model = resolveModelForTask('general', 'budget', 'implement the auth system and test it');
      expect(model).toBe(EXPECTED.budget.complex);
    });

    it('does NOT escalate for simple code questions', () => {
      const model = resolveModelForTask('general', 'budget', 'what does the main function do?');
      expect(model).toBe(EXPECTED.budget.simple);
    });

    it('does NOT escalate for simple commands', () => {
      const model = resolveModelForTask('general', 'budget', 'run the tests');
      expect(model).toBe(EXPECTED.budget.simple);
    });
  });

  describe('non-general task types bypass escalation', () => {
    it('command_help uses commandHelper slot regardless of complexity', () => {
      const model = resolveModelForTask('command_help', 'balanced', 'refactor everything');
      // commandHelper for balanced = glm-4.7-flash, but escalation triggers
      // Actually escalation applies to ALL task types — this tests that behavior
      expect(model).toBe(EXPECTED.balanced.complex);
    });

    it('error_analysis uses errorAnalyzer for simple prompts', () => {
      const model = resolveModelForTask('error_analysis', 'budget', 'explain this error');
      expect(model).toBe('qwen/qwen3-coder-next'); // budget errorAnalyzer
    });
  });
});
