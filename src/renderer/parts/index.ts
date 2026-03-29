/**
 * Parts system — typed message part rendering.
 *
 * Public API for the new parts-based message model.
 */

export { PartRegistry } from './part-registry'
export type { PartComponent, MessagePartV2 } from './part-registry'

export { ToolRegistry } from './tool-registry'
export type { ToolRenderer, ToolRenderProps } from './tool-registry'

export { groupContextParts } from './context-group'
export type { ContextGroupPart, ToolPartV2 } from './context-group'

export { parseIntoParts } from './parse-parts'
export type { TextPartV2, ReasoningPartV2, MessagePartV2 as ParsedPart } from './parse-parts'
