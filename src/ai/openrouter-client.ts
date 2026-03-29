/**
 * OpenRouterClient — concrete IAIClient backed by OpenRouter's
 * OpenAI-compatible REST API.
 *
 * Uses the `openai` npm package configured with OpenRouter's base URL.
 * All error handling is graceful: public methods return error AIResponse
 * objects instead of throwing.
 */

import OpenAI from 'openai';
import type { IAIClient } from './client';
import type {
  AIRequest,
  AIResponse,
  AIServiceConfig,
  ContextMessage,
  ModelConfig,
  RouterPreset,
  TaskType,
} from './types';
import { getModel } from './models';
import { getPreset } from './presets';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MAX_TOKENS = 8192;

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);

// ---------------------------------------------------------------------------
// Pure helper: map TaskType → RouterPreset field
// ---------------------------------------------------------------------------

const TASK_TO_PRESET_FIELD: Readonly<Record<string, keyof RouterPreset>> = {
  command_help: 'commandHelper',
  code_explain: 'codeExplainer',
  general: 'generalAssistant',
  error_analysis: 'errorAnalyzer',
};

/**
 * Pure function that resolves the model ID for a given task type and preset.
 *
 * Falls back to `generalAssistant` when the task type is not recognized.
 */
export function resolveModelForTask(
  taskType: TaskType,
  presetName: string,
): string {
  const preset = getPreset(presetName);
  const field = TASK_TO_PRESET_FIELD[taskType] ?? 'generalAssistant';
  return preset[field];
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  return inputCost + outputCost;
}

// ---------------------------------------------------------------------------
// Error response factory
// ---------------------------------------------------------------------------

function createErrorResponse(error: unknown): AIResponse {
  const isRateLimit =
    error instanceof Error &&
    'status' in error &&
    (error as { status: number }).status === 429;

  const message = isRateLimit
    ? 'Rate limit exceeded. Please wait a moment and try again.'
    : error instanceof Error
      ? `Error: ${error.message}`
      : 'An unknown error occurred.';

  return {
    content: message,
    model: '',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    cost: 0,
  };
}

// ---------------------------------------------------------------------------
// Build messages array (immutable)
// ---------------------------------------------------------------------------

function buildMessages(
  systemPrompt: string,
  context: ReadonlyArray<ContextMessage>,
  userPrompt: string,
): ReadonlyArray<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const system = { role: 'system' as const, content: systemPrompt };
  const contextMessages = context.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
  const user = { role: 'user' as const, content: userPrompt };

  return [system, ...contextMessages, user];
}

// ---------------------------------------------------------------------------
// OpenRouterClient
// ---------------------------------------------------------------------------

export class OpenRouterClient implements IAIClient {
  private readonly openai: OpenAI;
  private systemPrompt: string;
  private activePresetName: string;

  constructor(config: AIServiceConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required to create an OpenRouterClient.');
    }

    const baseURL = config.baseUrl || DEFAULT_BASE_URL;

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL,
      defaultHeaders: {
        'HTTP-Referer': 'https://aiterminal.dev',
        'X-Title': 'AITerminal',
      },
    });

    this.systemPrompt = config.systemPrompt;
    this.activePresetName = config.activePreset;

    // Validate that the preset exists at construction time.
    getPreset(this.activePresetName);
  }

  // -------------------------------------------------------------------------
  // IAIClient — getActiveModel
  // -------------------------------------------------------------------------

  getActiveModel(taskType: TaskType): ModelConfig {
    const modelId = resolveModelForTask(taskType, this.activePresetName);
    return getModel(modelId);
  }

  // -------------------------------------------------------------------------
  // IAIClient — setPreset
  // -------------------------------------------------------------------------

  setPreset(presetName: string): void {
    // Validate before mutating — getPreset throws on invalid names.
    getPreset(presetName);
    this.activePresetName = presetName;
  }

  getActivePresetName(): string {
    return this.activePresetName;
  }

  // -------------------------------------------------------------------------
  // Update system prompt (for agent mode)
  // -------------------------------------------------------------------------

  setSystemPrompt(systemPrompt: string): void {
    this.systemPrompt = systemPrompt;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  // -------------------------------------------------------------------------
  // IAIClient — query
  // -------------------------------------------------------------------------

  async query(request: AIRequest): Promise<AIResponse> {
    const startMs = Date.now();

    try {
      const modelId = resolveModelForTask(
        request.taskType,
        this.activePresetName,
      );
      const modelConfig = getModel(modelId);
      const messages = buildMessages(
        this.systemPrompt,
        request.context,
        request.prompt,
      );

      const completion = await this.openai.chat.completions.create({
        model: modelId,
        messages: [...messages],
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      });

      const latencyMs = Date.now() - startMs;
      const content = completion.choices[0]?.message?.content ?? '';
      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const cost = calculateCost(modelConfig, inputTokens, outputTokens);

      return {
        content,
        model: completion.model ?? modelId,
        inputTokens,
        outputTokens,
        latencyMs,
        cost,
      };
    } catch (error: unknown) {
      return createErrorResponse(error);
    }
  }

  // -------------------------------------------------------------------------
  // IAIClient — streamQuery
  // -------------------------------------------------------------------------

  async *streamQuery(request: AIRequest): AsyncIterable<string> {
    const modelId = request.modelOverride ?? resolveModelForTask(
      request.taskType,
      this.activePresetName,
    );
    const messages = buildMessages(
      this.systemPrompt,
      request.context,
      request.prompt,
    );

    // Retry only on connection/setup errors (before streaming starts).
    // Once streaming begins, yield chunks in real-time for responsive UX.
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const stream = await this.openai.chat.completions.create({
          model: modelId,
          messages: [...messages],
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          stream: true,
        });

        // Connection succeeded — stream in real-time (no more retries possible)
        for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
          const choice = chunk.choices[0];
          const delta = choice?.delta?.content;
          if (delta) {
            yield delta;
          }
          if (choice?.finish_reason && choice.finish_reason !== 'stop') {
            console.warn(`[OpenRouter] Stream ended with finish_reason: ${choice.finish_reason}`);
          }
          const usage = (chunk as any).usage;
          if (usage) {
            yield `\x00USAGE:${JSON.stringify(usage)}`;
          }
        }
        return; // Stream completed successfully
      } catch (error: unknown) {
        const status =
          error instanceof Error && 'status' in error
            ? (error as { status: number }).status
            : undefined;

        const isRetryable = status !== undefined && RETRYABLE_STATUS_CODES.has(status);

        if (!isRetryable || attempt >= RETRY_DELAYS_MS.length) {
          const errorMessage =
            error instanceof Error ? error.message : 'Stream error occurred.';
          yield `Error: ${errorMessage}`;
          return;
        }

        const delayMs = RETRY_DELAYS_MS[attempt];
        console.warn(
          `[OpenRouter] Retryable error (status ${status}), attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}. Retrying in ${delayMs}ms…`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
