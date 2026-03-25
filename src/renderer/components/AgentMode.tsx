/*
 * Path: /Users/ghost/Desktop/aiterminal/src/renderer/components/AgentMode.tsx
 * Module: renderer/components
 * Purpose: Agent Mode toggle for titlebar with compact glass design
 * Dependencies: react
 * Related: /Users/ghost/Desktop/aiterminal/src/renderer/hooks/useAgentLoop.ts
 * Keywords: agent-mode, toggle, titlebar-control, glass-design
 * Last Updated: 2026-03-24
 */

import { useState, useCallback } from 'react';

interface AgentModeProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  activeIntern?: string | null;
  isRunning?: boolean;
  status?: 'idle' | 'running' | 'completed' | 'error';
}

export function AgentMode({
  enabled,
  onToggle,
  activeIntern,
  isRunning = false,
  status = 'idle'
}: AgentModeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggle = useCallback(() => {
    const newState = !enabled;
    console.log(`[AgentMode] Toggling: ${enabled} → ${newState}`);
    onToggle(newState);
  }, [enabled, onToggle]);

  const internColors = {
    mei: '#3b82f6',
    sora: '#10b981',
    hana: '#f97316'
  };

  const internNames = {
    mei: 'MEI',
    sora: 'SORA',
    hana: 'HANA'
  };

  const statusText = {
    idle: 'Ready',
    running: activeIntern ? `${internNames[activeIntern as keyof typeof internNames]} Working` : 'Running',
    completed: 'Done ✓',
    error: 'Failed ✕'
  };

  return (
    <div className="titlebar-agent-mode">
      {/* Status indicator */}
      <div className="titlebar-agent-mode__status">
        {isRunning && (
          <span
            className="titlebar-agent-mode__dot titlebar-agent-mode__dot--active"
            style={{ backgroundColor: activeIntern ? internColors[activeIntern as keyof typeof internColors] : '#3b82f6' }}
          />
        )}
        <span className="titlebar-agent-mode__status-text">
          {statusText[status]}
        </span>
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`titlebar-agent-mode__toggle ${enabled ? 'titlebar-agent-mode__toggle--enabled' : ''}`}
        aria-label="Toggle Agent Mode"
      >
        <span className="titlebar-agent-mode__toggle-slider" />
        <span className="titlebar-agent-mode__toggle-label">
          {enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Info button with tooltip */}
      <div className="titlebar-agent-mode__info">
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="titlebar-agent-mode__info-btn"
          aria-label="Agent Mode Info"
        >
          ?
        </button>

        {showTooltip && (
          <div className="titlebar-agent-mode__tooltip">
            <h4 className="titlebar-agent-mode__tooltip-title">Agent Mode</h4>
            <p className="titlebar-agent-mode__tooltip-desc">
              Route tasks to specialized AI interns
            </p>
            <div className="titlebar-agent-mode__tooltip-interns">
              <div className="titlebar-agent-mode__tooltip-intern">
                <span className="titlebar-agent-mode__tooltip-dot" style={{ backgroundColor: internColors.mei }} />
                <span>MEI — Dev & Coding</span>
              </div>
              <div className="titlebar-agent-mode__tooltip-intern">
                <span className="titlebar-agent-mode__tooltip-dot" style={{ backgroundColor: internColors.sora }} />
                <span>SORA — Research & Analysis</span>
              </div>
              <div className="titlebar-agent-mode__tooltip-intern">
                <span className="titlebar-agent-mode__tooltip-dot" style={{ backgroundColor: internColors.hana }} />
                <span>HANA — Content & Marketing</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
