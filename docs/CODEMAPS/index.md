# AITerminal Codebase Index

**Last Updated:** 2026-03-29
**Project:** AITerminal - AI/Shell Hybrid Terminal
**Stack:** Electron + React + TypeScript + Vite + Three.js
**Total Files:** 207 source files | **Total Lines:** ~33,500 | **Tests:** 1,086

## Quick Navigation

- **[Frontend](frontend.md)** - React UI: App shell, 45 components, 25 hooks, 20 CSS files
- **[Backend](backend.md)** - Electron main process, IPC handlers, PTY, services
- **[Integrations](integrations.md)** - Ecosystem bridges (lossless, dietmcp, ferroclaw, kokoro)
- **[Shared Utilities](shared-utilities.md)** - AI client, shell service, themes, types, agent-loop

## New Modules (2026-03-29)

| Module | Files | Purpose |
|--------|-------|---------|
| `renderer/parts/` | 5 | Typed message parts — PartRegistry, ToolRegistry, ContextGroup (OpenCode-inspired) |
| `renderer/utils/markdown-*.ts` | 2 | Streaming markdown heal + block splitting |
| `renderer/components/StreamingMarkdown.tsx` | 1 | Streaming-safe markdown renderer with code copy |
| `renderer/components/TextShimmer.tsx` | 1 | Dual-layer thinking animation |
| `renderer/components/ProcessBadge.tsx` | 1 | Color-coded 3-letter tool badges (Agent Zero-inspired) |
| `renderer/components/BottomPanel.tsx` | 1 | VS Code-style bottom panel with tab switching |
| `renderer/components/PanelTabBar.tsx` | 1 | VS Code-style panel tab bar |
| `renderer/hooks/useBottomPanel.ts` | 1 | Bottom panel state (tab, height, persistence) |
| `renderer/hooks/useAutoCollapse.ts` | 1 | Auto-collapse timer for tool results |
| `renderer/hooks/usePacedValue.ts` | 1 | Adaptive typewriter throttle for streaming |
| `renderer/hooks/useVirtualMessages.ts` | 1 | Lightweight message windowing |
| `renderer/utils/accent-presets.ts` | 1 | 6 switchable accent color presets |
| `renderer/utils/block-cache.ts` | 1 | LRU cache for rendered markdown blocks |
| `renderer/components/icons/VSCodeIcons.tsx` | 1 | 17 VS Code codicon-style SVG icons |

## Project Overview

AITerminal is a next-generation terminal application that seamlessly integrates AI assistance with traditional shell workflows. Built on Electron for cross-platform desktop support, React for the UI, and OpenRouter for AI model routing.

### Core Architecture

**Multi-Process Architecture:**
- **Main Process** (Node.js) - PTY management, IPC handlers, file operations
- **Renderer Process** (React/Vite) - UI components, terminal view, chat sidebar
- **PTY Sessions** (node-pty) - Multiple terminal sessions with unique IDs

**Key Patterns:**
- **IPC Bridge Pattern** - `createPtyBridge()` returns `{ writeToPty, resizePty, dispose }`
- **Natural Language Detection** - `isNaturalLanguage()` routes input to AI or shell
- **Theme Immutability** - `ThemeManager.setTheme()` returns new instance
- **File Operation Policy** - `workspace-policy.ts` validates all file paths

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Electron | Cross-platform desktop framework |
| **UI** | React 18 + Vite | Component-based UI, fast dev server |
| **Terminal** | xterm.js | Terminal emulator with ANSI support |
| **PTY** | node-pty | Pseudo-terminal spawning |
| **AI** | OpenRouter API | Model routing and streaming |
| **3D Avatars** | Three.js + @pixiv/three-vrm | VRM avatar visualization |
| **Testing** | Vitest + Playwright | Unit and E2E tests |
| **Types** | TypeScript | Type-safe development |

## Directory Structure

```
aiterminal/
├── src/
│   ├── main/              # Electron main process (Node.js context)
│   │   ├── main.ts           # App entry, BrowserWindow
│   │   ├── ipc-handlers.ts   # IPC bridge (AI, file ops, PTY)
│   │   ├── terminal-session-manager.ts  # Multi-session PTY
│   │   └── workspace-policy.ts          # File access sandbox
│   ├── renderer/          # React UI (Vite dev server)
│   │   ├── App.tsx           # Root layout (~1300 lines)
│   │   ├── components/       # 45 UI components
│   │   │   ├── ClaudeCodeChat.tsx  # AI chat panel
│   │   │   ├── BottomPanel.tsx     # VS Code bottom panel
│   │   │   ├── StreamingMarkdown.tsx # Streaming markdown renderer
│   │   │   └── icons/VSCodeIcons.tsx # Codicon-style icons
│   │   ├── hooks/            # 25 React hooks
│   │   │   ├── useChat.ts       # Chat state + agent loop (~950 lines)
│   │   │   ├── useBottomPanel.ts # Bottom panel state
│   │   │   └── useAgentLoop.ts   # Agent loop orchestration
│   │   ├── parts/            # Message parts system (OpenCode-inspired)
│   │   │   ├── parse-parts.ts    # Tag→typed parts parser
│   │   │   ├── context-group.ts  # Auto-merge context tools
│   │   │   └── part-registry.ts  # Pluggable part renderers
│   │   ├── styles/           # 20 CSS files (glass morphism + accent vars)
│   │   └── utils/            # Markdown heal, accent presets, block cache
│   ├── ai/                # AI client layer
│   │   ├── openrouter-client.ts  # Streaming + auto-escalation
│   │   ├── models.ts             # 15 model definitions
│   │   └── presets.ts            # 4 router presets
│   ├── agent/             # Agent service (tag parsing)
│   ├── agent-loop/        # Autonomous loop (Mei/Sora/Hana)
│   ├── shell/             # NL detection + shell routing
│   ├── themes/            # 5 themes + accent presets
│   ├── types/             # Shared TypeScript interfaces
│   └── integrations/      # Ecosystem bridges
├── docs/CODEMAPS/         # This directory
└── package.json
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `src/main/main.ts` | Electron main process entry |
| `src/renderer/main.tsx` | React application root |
| `src/main/preload.ts` | Context bridge for IPC |
| `src/ai/client.ts` | AI client factory |
| `src/shell/shell-service.ts` | Natural language detection |

## Critical Data Flows

### Shell Input → AI Routing
1. User types in terminal
2. `isNaturalLanguage()` checks input patterns
3. If NL: inject into chat sidebar, prevent PTY write
4. If shell: write to PTY via `writeToSession()`

### PTY Output → Error Detection
1. PTY emits data
2. `createPtyBridge()` forwards via `session-data` IPC
3. Renderer checks for error patterns
4. Errors route to chat sidebar with context

### AI Streaming + Agent Loop
1. Chat send → `ai-query-stream` IPC
2. `OpenRouterClient.streamQuery()` yields chunks
3. Main sends `ai-stream-chunk` events → renderer
4. `StreamingMarkdown` renders with markdown healing + code copy
5. `applyRunTags()` extracts commands (4 formats: wrapper, colon, hybrid, bash block)
6. `extractFileOps()` parses [READ/EDIT/FILE/DELETE] tags
7. Agent loop: auto-continues after ops, nudges if AI describes instead of acting

### Accent Theme System
1. `accent-presets.ts` defines 6 presets (Teal, Purple, Blue, Green, Orange, Rose)
2. `applyAccentPreset()` sets CSS custom properties on `:root`
3. All UI accent colors use `var(--accent-color)` — instant theme switch
4. Persisted to localStorage, loads on mount

## Development Workflow

**Build & Run:**
```bash
npm run dev          # Start dev server (Vite + Electron)
npm run build        # Build TypeScript + Vite bundle
npm run build:electron  # Build Electron app for distribution
```

**Testing:**
```bash
npm run test         # Run all tests (Vitest)
npm run test:e2e     # Run Playwright E2E tests
npm run test:coverage  # Generate coverage report (target: 80%+)
```

**Linting:**
```bash
npm run lint         # TypeScript type check only
```

## Security Architecture

- **Context Isolation:** Enabled, no node integration
- **Preload Script:** All APIs via `contextBridge`
- **File Operations:** Gated by `workspace-policy.ts`
- **IPC Boundaries:** No remote module, no `eval()`

## Ecosystem Integrations

All integrations are **opt-in** via environment variables:
- **lossless-recall** - Chat history persistence
- **dietmcp** - MCP → CLI bridge
- **ferroclaw** - Local Rust agent
- **kokoro** - Text-to-speech
- **superenv** - Additional secrets

See [Integrations Codemap](integrations.md) for details.

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Project development guide
- [ECOSYSTEM.md](../../ECOSYSTEM.md) - Integration documentation
- [.env.example](../../.env.example) - Environment configuration

## Statistics

| Metric | Value |
|--------|-------|
| Total Files | 207 |
| Total Lines | ~33,500 |
| Test Files | 67 |
| Tests | 1,086 |
| Languages | TypeScript, TSX, CSS |
| Framework | React + Electron + Three.js |
| Test Coverage Target | 80%+ |
| Accent Colors | 6 presets (Teal default) |
| AI Models | 15 via OpenRouter |
