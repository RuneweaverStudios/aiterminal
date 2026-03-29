/**
 * BottomPanel — VS Code-style bottom panel with tab switching.
 * Contains TERMINAL, CLAUDE, and OUTPUT tabs.
 */

import type { FC, ReactNode } from 'react'
import { PanelTabBar } from './PanelTabBar'
import type { PanelTab } from './PanelTabBar'
import type { BottomPanelTab } from '../hooks/useBottomPanel'
import '../styles/bottom-panel.css'

interface BottomPanelProps {
  readonly isOpen: boolean
  readonly activeTab: BottomPanelTab
  readonly height: number
  readonly onTabChange: (tab: BottomPanelTab) => void
  readonly onClose: () => void
  readonly terminalContent: ReactNode
  readonly claudeContent: ReactNode
  readonly outputContent?: ReactNode
  readonly rightContent?: ReactNode
}

const TABS: readonly PanelTab[] = [
  { id: 'terminal', label: 'TERMINAL' },
  { id: 'claude', label: 'CLAUDE' },
  { id: 'output', label: 'OUTPUT' },
]

export const BottomPanel: FC<BottomPanelProps> = ({
  isOpen,
  activeTab,
  height,
  onTabChange,
  onClose,
  terminalContent,
  claudeContent,
  outputContent,
  rightContent,
}) => {
  if (!isOpen) return null

  return (
    <div className="bottom-panel" style={{ height }}>
      <PanelTabBar
        tabs={TABS}
        activeId={activeTab}
        onTabClick={(id) => onTabChange(id as BottomPanelTab)}
        onClose={onClose}
        rightContent={rightContent}
      />
      <div className="bottom-panel__content">
        {/* TERMINAL tab — always mounted, visibility toggled for xterm resize */}
        <div
          className="bottom-panel__pane"
          style={{ display: activeTab === 'terminal' ? 'flex' : 'none' }}
        >
          {terminalContent}
        </div>

        {/* CLAUDE tab */}
        {activeTab === 'claude' && (
          <div className="bottom-panel__pane">
            {claudeContent}
          </div>
        )}

        {/* OUTPUT tab */}
        {activeTab === 'output' && (
          <div className="bottom-panel__pane">
            {outputContent || (
              <div className="bottom-panel__empty">
                <span style={{ opacity: 0.3 }}>No output</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
