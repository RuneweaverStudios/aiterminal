/**
 * Native tool definitions for OpenRouter/OpenAI function calling API.
 *
 * These replace text-based [RUN:], [READ:], [EDIT:] tags with structured
 * tool_calls that work correctly with thinking models (QWen3, DeepSeek).
 */

export const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Execute a shell command in the terminal. Use this to run tests, build projects, install dependencies, or any CLI operation.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute (e.g. "npm test", "cargo build", "python main.py")',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. Use this to examine source code, configuration files, or any text file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to read (relative to the project root, e.g. "src/main.rs", "package.json")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Edit a file using search-and-replace. Find exact text in the file and replace it with new text.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to edit',
          },
          search: {
            type: 'string',
            description: 'The exact text to find in the file',
          },
          replace: {
            type: 'string',
            description: 'The replacement text',
          },
        },
        required: ['path', 'search', 'replace'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_file',
      description: 'Create a new file with the given content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to create',
          },
          content: {
            type: 'string',
            description: 'The file content',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_file',
      description: 'Delete a file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to delete',
          },
        },
        required: ['path'],
      },
    },
  },
] as const

/**
 * Sentinel prefix for tool call data in the streaming pipeline.
 * Format: \x00TOOLCALL:<JSON>
 */
export const TOOL_CALL_SENTINEL = '\x00TOOLCALL:'

export interface ToolCallData {
  readonly name: string
  readonly arguments: Record<string, string>
}
