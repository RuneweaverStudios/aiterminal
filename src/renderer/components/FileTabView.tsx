import type { FC } from 'react';

interface FileTabViewProps {
  filePath: string;
  content: string;
  language: string | null;
}

/**
 * Read-only code viewer rendered inside a terminal tab slot.
 */
export const FileTabView: FC<FileTabViewProps> = ({ filePath, content, language }) => {
  const lines = content.split('\n');

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--terminal-bg, #1a1a2e)',
      color: '#e0e0e0',
      fontFamily: 'var(--terminal-font, "JetBrains Mono", "Fira Code", monospace)',
      fontSize: '13px',
      overflow: 'hidden',
    }}>
      {/* File header */}
      <div style={{
        padding: '6px 14px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{ opacity: 0.5, fontSize: '12px' }}>📄</span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>{filePath}</span>
        {language && (
          <span style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '4px',
            background: 'rgba(99,102,241,0.2)',
            color: 'rgba(99,102,241,0.9)',
            fontWeight: 600,
          }}>
            {language}
          </span>
        )}
        <span style={{ fontSize: '10px', opacity: 0.4, marginLeft: 'auto' }}>
          {lines.length} lines
        </span>
      </div>

      {/* Code content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} style={{ lineHeight: '1.5' }}>
                <td style={{
                  padding: '0 12px 0 14px',
                  textAlign: 'right',
                  color: 'rgba(255,255,255,0.2)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: '1px',
                  fontSize: '12px',
                }}>
                  {i + 1}
                </td>
                <td style={{
                  padding: '0 14px 0 8px',
                  whiteSpace: 'pre',
                  tabSize: 2,
                }}>
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
