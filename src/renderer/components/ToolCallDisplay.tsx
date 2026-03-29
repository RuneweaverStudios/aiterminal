import React, { useState } from 'react';

/**
 * Tool call display — opencode-inspired inline/block rendering.
 * Collapsed by default, expandable for details.
 */

interface ToolCallProps {
  type: 'read' | 'write' | 'edit' | 'run' | 'delete';
  path?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  summary?: string;
  details?: string;
  diff?: { removed: string[]; added: string[] };
  errorMsg?: string;
}

const ICONS: Record<string, string> = {
  read: '→',
  write: '←',
  edit: '←',
  run: '$',
  delete: '×',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'rgba(255,255,255,0.3)',
  running: '#f59e0b',
  done: '#10b981',
  error: '#ef4444',
};

const STATUS_INDICATORS: Record<string, string> = {
  pending: '◌',
  running: '◐',
  done: '✓',
  error: '✗',
};

export const ToolCallDisplay: React.FC<ToolCallProps> = ({
  type,
  path,
  status,
  summary,
  details,
  diff,
  errorMsg,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = details || diff || errorMsg;
  const icon = ICONS[type] || '•';
  const statusColor = STATUS_COLORS[status];
  const statusIcon = STATUS_INDICATORS[status];

  return (
    <div style={styles.container}>
      {/* Inline header — always visible */}
      <div
        style={{
          ...styles.header,
          cursor: hasDetails ? 'pointer' : 'default',
        }}
        onClick={hasDetails ? () => setExpanded(!expanded) : undefined}
      >
        <span style={{ ...styles.icon, color: statusColor }}>{icon}</span>
        <span style={styles.label}>
          {type === 'run' ? summary || path : path || summary}
        </span>
        {status === 'running' && (
          <span style={styles.spinner}>◐</span>
        )}
        {status !== 'running' && (
          <span style={{ ...styles.status, color: statusColor }}>{statusIcon}</span>
        )}
        {summary && type !== 'run' && (
          <span style={styles.meta}>{summary}</span>
        )}
        {hasDetails && (
          <span style={styles.expandHint}>
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {/* Expandable block — details, diff, or error */}
      {expanded && hasDetails && (
        <div style={styles.block}>
          {diff && (
            <div style={styles.diffContainer}>
              {diff.removed.map((line, i) => (
                <div key={`r-${i}`} style={styles.removedLine}>
                  <span style={styles.diffSign}>-</span>{line || ' '}
                </div>
              ))}
              {diff.added.map((line, i) => (
                <div key={`a-${i}`} style={styles.addedLine}>
                  <span style={styles.diffSign}>+</span>{line || ' '}
                </div>
              ))}
            </div>
          )}
          {details && !diff && (
            <pre style={styles.details}>{details}</pre>
          )}
          {errorMsg && (
            <div style={styles.error}>{errorMsg}</div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Render a list of tool calls from processed operations.
 */
export function renderToolCalls(text: string): { cleanText: string; toolCalls: React.ReactNode[] } {
  const toolCalls: React.ReactNode[] = [];
  let cleanText = text;

  // Match executed commands
  const execRegex = /⚡ Executed: `([^`]+)`/g;
  let match;
  let idx = 0;
  while ((match = execRegex.exec(text)) !== null) {
    toolCalls.push(
      <ToolCallDisplay
        key={`run-${idx++}`}
        type="run"
        summary={match[1]}
        status="done"
      />
    );
  }
  cleanText = cleanText.replace(/⚡ Executed: `[^`]+`\n*/g, '');

  // Match file reads
  const readRegex = /📄 Read \*\*([^*]+)\*\* — (\d+ lines, \d+KB)/g;
  while ((match = readRegex.exec(text)) !== null) {
    toolCalls.push(
      <ToolCallDisplay
        key={`read-${idx++}`}
        type="read"
        path={match[1]}
        summary={match[2]}
        status="done"
      />
    );
  }
  cleanText = cleanText.replace(/📄 Read \*\*[^*]+\*\* — \d+ lines, \d+KB\n*/g, '');

  // Match file writes
  const writeRegex = /✅ \*\*([^*]+)\*\*/g;
  while ((match = writeRegex.exec(text)) !== null) {
    toolCalls.push(
      <ToolCallDisplay
        key={`write-${idx++}`}
        type="edit"
        path={match[1]}
        status="done"
      />
    );
  }

  // Match errors
  const errorRegex = /❌ (\w+) ([^:]+): (.+)/g;
  while ((match = errorRegex.exec(text)) !== null) {
    toolCalls.push(
      <ToolCallDisplay
        key={`err-${idx++}`}
        type={match[1] as any}
        path={match[2]}
        status="error"
        errorMsg={match[3]}
      />
    );
  }

  cleanText = cleanText
    .replace(/✅ \*\*[^*]+\*\*\n*```diff[\s\S]*?```\n*/g, '')
    .replace(/✅ \w+ [^\n]+\n*/g, '')
    .replace(/❌ \w+ [^\n]+\n*/g, '')
    .trim();

  return { cleanText, toolCalls };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    margin: '2px 0',
    borderRadius: '4px',
    overflow: 'hidden',
    fontSize: '12px',
    fontFamily: "'SF Mono', 'Cascadia Code', monospace",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    background: 'rgba(255,255,255,0.03)',
    borderLeft: '2px solid rgba(255,255,255,0.08)',
  },
  icon: {
    fontWeight: 700,
    fontSize: '11px',
    width: '12px',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    fontSize: '10px',
    color: '#f59e0b',
  },
  status: {
    fontSize: '10px',
    fontWeight: 700,
    flexShrink: 0,
  },
  meta: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
  },
  expandHint: {
    fontSize: '8px',
    color: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  block: {
    borderLeft: '2px solid rgba(255,255,255,0.08)',
    marginLeft: '0',
    background: 'rgba(0,0,0,0.2)',
  },
  diffContainer: {
    overflow: 'auto',
    maxHeight: '200px',
    fontSize: '11px',
    lineHeight: '1.4',
  },
  removedLine: {
    display: 'flex',
    background: 'rgba(255,50,50,0.08)',
    color: '#ff6b6b',
    padding: '0 8px',
    whiteSpace: 'pre' as const,
  },
  addedLine: {
    display: 'flex',
    background: 'rgba(80,250,123,0.08)',
    color: '#50fa7b',
    padding: '0 8px',
    whiteSpace: 'pre' as const,
  },
  diffSign: {
    width: '14px',
    flexShrink: 0,
    fontWeight: 700,
    userSelect: 'none' as const,
  },
  details: {
    margin: 0,
    padding: '6px 8px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    maxHeight: '150px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  error: {
    padding: '4px 8px',
    color: '#ef4444',
    fontSize: '11px',
  },
};
