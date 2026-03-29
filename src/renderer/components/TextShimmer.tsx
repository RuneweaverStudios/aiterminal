/**
 * TextShimmer — dual-layer text animation for thinking/loading states.
 *
 * Renders two copies of the text: a base layer and a shimmer overlay.
 * The shimmer sweeps across using CSS gradient animation.
 *
 * Inspired by OpenCode's TextShimmer component.
 */

import type { FC } from 'react'

export interface TextShimmerProps {
  readonly text: string
  readonly active: boolean
  readonly className?: string
}

export const TextShimmer: FC<TextShimmerProps> = ({
  text,
  active,
  className,
}) => {
  const classes = [
    'text-shimmer',
    active ? 'text-shimmer--active' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      <span className="text-shimmer__base">{text}</span>
      <span className="text-shimmer__shimmer" aria-hidden="true">
        {text}
      </span>
    </span>
  )
}
