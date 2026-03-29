/**
 * PanelTabBar — VS Code-style tab bar for the bottom panel.
 * Uppercase labels, accent underline on active, right-side action buttons.
 */

import type { FC } from 'react'
import { IconClose } from './icons/VSCodeIcons'

export interface PanelTab {
  readonly id: string
  readonly label: string
  readonly badge?: number
}

interface PanelTabBarProps {
  readonly tabs: readonly PanelTab[]
  readonly activeId: string
  readonly onTabClick: (id: string) => void
  readonly onClose: () => void
  readonly rightContent?: React.ReactNode
}

export const PanelTabBar: FC<PanelTabBarProps> = ({
  tabs,
  activeId,
  onTabClick,
  onClose,
  rightContent,
}) => {
  return (
    <div className="panel-tab-bar">
      <div className="panel-tab-bar__tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab-bar__tab ${tab.id === activeId ? 'panel-tab-bar__tab--active' : ''}`}
            onClick={() => onTabClick(tab.id)}
            type="button"
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="panel-tab-bar__badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="panel-tab-bar__actions">
        {rightContent}
        <button
          className="panel-tab-bar__action"
          onClick={onClose}
          title="Close panel"
          type="button"
        >
          <IconClose size={14} />
        </button>
      </div>
    </div>
  )
}
