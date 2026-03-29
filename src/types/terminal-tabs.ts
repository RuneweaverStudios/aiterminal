/**
 * Terminal tab types for multi-terminal support
 */

export interface TerminalTab {
  readonly id: string;
  readonly type: 'terminal';
  /** PTY session id — stable for this tab until closed. */
  readonly sessionId: string;
  readonly name: string;
  readonly shell: string;
  readonly cwd: string;
  readonly createdAt: number;
  readonly isActive: boolean;
  /** Agent intern working in this tab (mei/sora/hana) */
  readonly agentIntern?: string;
  /** What the agent is currently doing */
  readonly agentActivity?: string;
}

export interface FileTab {
  readonly id: string;
  readonly type: 'file';
  readonly name: string;
  readonly filePath: string;
  readonly content: string;
  readonly language: string | null;
  readonly createdAt: number;
  readonly isActive: boolean;
}

export type Tab = TerminalTab | FileTab;

export interface TerminalTabsState {
  readonly tabs: ReadonlyArray<Tab>;
  readonly activeTabId: string | null;
  readonly activeSessionId: string | null;
  readonly sessions: ReadonlyMap<string, TerminalSessionInfo>;
}

export interface TerminalSessionInfo {
  readonly sessionId: string;
  readonly ptyPid: number;
  readonly shell: string;
  readonly cwd: string;
  readonly unsubscribe: () => void;
}
