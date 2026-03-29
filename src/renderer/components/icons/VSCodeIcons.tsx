/**
 * VS Code Codicon-style SVG icons.
 * 16x16 viewBox, currentColor fill, no external dependencies.
 */

import type { FC, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { readonly size?: number }

const Icon: FC<IconProps> = ({ size = 16, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {children}
  </svg>
)

// --- Layout ---

export const IconSidebarLeft: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 2h4v12H2V2zm5 0h7v1H7V2zm0 2h7v1H7V4zm0 2h7v1H7V6zm0 4h7v1H7v-1zm0 2h5v1H7v-1z" />
  </Icon>
)

export const IconSidebarRight: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M10 2h4v12h-4V2zM2 2h7v1H2V2zm0 2h7v1H2V4zm0 2h7v1H2V6zm0 4h7v1H2v-1zm0 2h5v1H2v-1z" />
  </Icon>
)

export const IconPanel: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 2h12v4H2V2zm0 5h12v7H2V7zm1 1v5h10V8H3z" />
  </Icon>
)

export const IconSplitH: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 2h5v12H2V2zm7 0h5v12H9V2zm-6 1v10h3V3H3zm7 0v10h3V3h-3z" />
  </Icon>
)

export const IconLayout: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 2h12v1H2V2zm0 2h5v10H2V4zm6 0h6v10H8V4zm-5 1v8h3V5H3zm6 0v8h4V5H9z" />
  </Icon>
)

// --- Actions ---

export const IconTerminal: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 3l5 4-5 4V3zm6 8h6v1H8v-1z" />
  </Icon>
)

export const IconChat: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 2h12v9H6l-4 3V2zm1 1v8.17L5.59 10H13V3H3z" />
  </Icon>
)

export const IconFiles: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M5 1H2v13h10v-3h2V4l-3-3H5zm6 12H3V2h4v3h3v8h1zm1-8H9V2h.5L12 4.5V5z" />
  </Icon>
)

export const IconSearch: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04-1.06 1.06-3.04-3.04zM11 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z" />
  </Icon>
)

export const IconSettings: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M9.1 1H6.9l-.4 1.5c-.3.1-.6.3-.9.5L4.2 2.4 2.6 4.6l1 1.2c-.1.3-.1.5-.1.7v.5l-1 1.2 1.6 2.2 1.4-.6c.3.2.6.4.9.5L6.9 12h2.2l.4-1.5c.3-.1.6-.3.9-.5l1.4.6 1.6-2.2-1-1.2c.1-.3.1-.5.1-.7v-.5l1-1.2-1.6-2.2-1.4.6c-.3-.2-.6-.4-.9-.5L9.1 1zM8 9.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
  </Icon>
)

// --- Common ---

export const IconClose: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M8 7.06L11.47 3.6l.94.94L8.94 8l3.47 3.47-.94.94L8 8.94 4.53 12.4l-.94-.94L7.06 8 3.6 4.53l.94-.94L8 7.06z" />
  </Icon>
)

export const IconAdd: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M7.5 2v5.5H2v1h5.5V14h1V8.5H14v-1H8.5V2h-1z" />
  </Icon>
)

export const IconCopy: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M4 4v9h7V4H4zm6 8H5V5h5v7zm2-10H3v1h8v8h1V2z" />
  </Icon>
)

export const IconChevronDown: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M8 10.17L3.41 5.59 4.83 4.17 8 7.34l3.17-3.17 1.42 1.42L8 10.17z" />
  </Icon>
)

export const IconEllipsis: FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="4" cy="8" r="1.5" />
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="12" cy="8" r="1.5" />
  </Icon>
)

export const IconPlay: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M4 2l10 6-10 6V2z" />
  </Icon>
)

export const IconStop: FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="10" height="10" rx="1" />
  </Icon>
)

export const IconMaximize: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z" />
  </Icon>
)

export const IconMinimize: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 8h10v1H3V8z" />
  </Icon>
)

export const IconGitBranch: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M10 4a2 2 0 1 0-1 1.73V7H7v2.27A2 2 0 1 0 8 11V9h2a1 1 0 0 0 1-1V5.73A2 2 0 0 0 10 4zM6 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4-9a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </Icon>
)

export const IconPalette: FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M8 1a7 7 0 0 0 0 14c.55 0 1-.45 1-1v-.5c0-.28-.11-.53-.29-.71a.5.5 0 0 1 .29-.79H10c2.76 0 5-2.24 5-5A7 7 0 0 0 8 1zM4.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
  </Icon>
)
