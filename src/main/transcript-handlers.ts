/*
 * Path: /Users/ghost/Desktop/aiterminal/src/main/transcript-handlers.ts
 * Module: main
 * Purpose: IPC handlers for transcript database - search, retrieval, stats
 * Dependencies: electron, ../agent-loop/transcript-db
 * Related: /Users/ghost/Desktop/aiterminal/src/agent-loop/router.ts
 * Keywords: transcript, ipc-handlers, search, session-history
 * Last Updated: 2026-03-24
 */

import { ipcMain } from 'electron';
import { getTranscriptDb } from '../agent-loop/transcript-db.js';

/**
 * Get transcript database instance.
 */
function getDb() {
  return getTranscriptDb();
}

/**
 * Search transcripts handler.
 */
ipcMain.handle('transcript:search', async (_event, query: string, limit = 50) => {
  try {
    const db = getDb();
    const results = db.searchMessages(query, limit);
    return {
      success: true,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

/**
 * Semantic search handler.
 */
ipcMain.handle('transcript:semantic-search', async (_event, query: string, limit = 20) => {
  try {
    const db = getDb();
    const results = db.semanticSearch(query, limit);
    return {
      success: true,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

/**
 * Get session handler.
 */
ipcMain.handle('transcript:get-session', async (_event, sessionId: string) => {
  try {
    const db = getDb();
    const session = db.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    const messages = db.getMessages(sessionId);
    const events = db.getEvents(sessionId);

    return {
      success: true,
      session,
      messages,
      events
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

/**
 * Get recent sessions handler.
 */
ipcMain.handle('transcript:get-recent-sessions', async (_event, limit = 20, intern?: string) => {
  try {
    const db = getDb();
    const sessions = db.getRecentSessions(limit, intern);

    return {
      success: true,
      sessions
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

/**
 * Get database stats handler.
 */
ipcMain.handle('transcript:get-stats', async () => {
  try {
    const db = getDb();
    const stats = db.getStats();

    return {
      success: true,
      stats
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

/**
 * Create a new session (for chat sidebar agent loops).
 */
ipcMain.handle('transcript:create-session', async (_event, params: {
  id: string;
  intern: string;
  task: string;
  workspace?: string;
}) => {
  try {
    const db = getDb();
    db.createSession({
      id: params.id,
      runId: `chat-${Date.now()}`,
      intern: params.intern,
      task: params.task,
      workspace: params.workspace,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * Add a message to a session.
 */
ipcMain.handle('transcript:add-message', async (_event, params: {
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}) => {
  try {
    const db = getDb();
    // Truncate large content to 10KB
    const content = params.content.length > 10_000
      ? params.content.slice(0, 4000) + '\n...[truncated]...\n' + params.content.slice(-4000)
      : params.content;
    db.addMessage({
      sessionId: params.sessionId,
      role: params.role,
      content,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * Add an event to a session (tool calls, errors).
 */
ipcMain.handle('transcript:add-event', async (_event, params: {
  sessionId: string;
  stream: string;
  data: Record<string, unknown>;
}) => {
  try {
    const db = getDb();
    db.addEvent({
      sessionId: params.sessionId,
      stream: params.stream,
      data: params.data,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * End a session.
 */
ipcMain.handle('transcript:end-session', async (_event, sessionId: string, status: 'completed' | 'failed' | 'timeout') => {
  try {
    const db = getDb();
    db.endSession(sessionId, status);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * Search for relevant past session context to inject into prompts.
 * Returns formatted context block for the model.
 */
ipcMain.handle('transcript:search-for-context', async (_event, query: string, workspace?: string) => {
  try {
    const db = getDb();
    // Extract first 100 chars as search query for very long prompts
    const searchQuery = query.length > 100 ? query.slice(0, 100) : query;
    const results = db.searchMessages(searchQuery, 20);

    if (results.length === 0) {
      return { success: true, context: '' };
    }

    // Group by session, take top 3 unique sessions
    const sessionMap = new Map<string, typeof results>();
    for (const r of results) {
      if (!sessionMap.has(r.sessionId)) {
        sessionMap.set(r.sessionId, []);
      }
      sessionMap.get(r.sessionId)!.push(r);
    }

    const sessionEntries = Array.from(sessionMap.entries()).slice(0, 3);
    const contextParts: string[] = [];

    for (const [sessionId, messages] of sessionEntries) {
      const session = db.getSession(sessionId);
      if (!session) continue;
      // Filter by workspace if provided
      if (workspace && session.workspace && session.workspace !== workspace) continue;

      const status = session.status;
      const task = session.task.slice(0, 200);
      const keyMessages = messages
        .slice(0, 3)
        .map(m => m.content.slice(0, 150))
        .join(' | ');

      contextParts.push(`- Task: ${task} [${status}]\n  Key context: ${keyMessages}`);
    }

    if (contextParts.length === 0) {
      return { success: true, context: '' };
    }

    const context = `<past_sessions>\nRelevant past sessions (do NOT repeat failed approaches):\n${contextParts.join('\n')}\n</past_sessions>`;
    return { success: true, context };
  } catch (error) {
    return { success: false, context: '', error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * Mark orphaned "running" sessions as "timeout" (called on startup).
 */
ipcMain.handle('transcript:cleanup-orphans', async () => {
  try {
    const db = getDb();
    const running = db.getRecentSessions(100).filter(s => s.status === 'running');
    for (const session of running) {
      db.endSession(session.id, 'timeout');
    }
    return { success: true, cleaned: running.length };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

/**
 * Vacuum database handler.
 */
ipcMain.handle('transcript:vacuum', async () => {
  try {
    const db = getDb();
    db.vacuum();

    return {
      success: true,
      message: 'Database vacuumed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
