# CodeNomad Architecture

## Overview
CodeNomad is an AI-powered coding assistant built as a monorepo with npm workspaces.

**Version**: 0.9.1  
**Tech Stack**: SolidJS, TypeScript, Electron/Tauri, Tailwind CSS

## Package Structure

```
CodeNomad/
├── packages/
│   ├── ui/              # Frontend (SolidJS)
│   ├── server/          # Backend (TypeScript)
│   ├── electron-app/    # Desktop shell (Electron)
│   └── tauri-app/       # Alternative desktop shell (Tauri)
├── .opencode/           # Agent system
└── package.json         # Workspace root
```

## Package Details

### packages/ui
**Purpose**: SolidJS frontend application  
**Framework**: SolidJS 1.8+  
**UI Libraries**: Kobalte UI, SUID Material  
**Styling**: Tailwind CSS, custom CSS tokens  
**Build**: Vite

Key directories:
- `src/components/` - UI components (75+ files)
- `src/stores/` - State management (signals-based)
- `src/styles/` - CSS organization
- `src/lib/` - Utilities and helpers

### packages/server
**Purpose**: TypeScript backend server  
**Features**: HTTP API, SSE events, workspace management, plugin system

Key directories:
- `src/server/routes/` - API endpoints
- `src/auth/` - Authentication system
- `src/workspaces/` - Workspace management
- `src/plugins/` - Plugin handling
- `src/filesystem/` - File operations

### packages/electron-app
**Purpose**: Desktop application shell using Electron  
**Entry**: `electron/main/main.ts`

Key files:
- `electron/main/ipc.ts` - IPC communication
- `electron/main/menu.ts` - Application menu
- `electron/main/storage.ts` - Local storage

### packages/tauri-app
**Purpose**: Alternative lightweight desktop shell using Tauri  
**Config**: `src-tauri/tauri.conf.json`

## Key Architectural Patterns

### State Management
- SolidJS signals for reactive state
- Stores in `packages/ui/src/stores/`
- Message system in `stores/message-v2/`

### Styling System
- CSS tokens in `styles/tokens.css`
- Utilities in `styles/utilities.css`
- Feature-based organization in subdirectories
- Tailwind for utility classes

### Component Patterns
- Functional components with props destructuring
- Show/For for conditional/list rendering
- Kobalte for accessible primitives
- SUID Material for Material Design components

## Scripts

```bash
# Development
npm run dev              # Start Electron app in dev mode
npm run dev:tauri        # Start Tauri app in dev mode

# Build
npm run build            # Build Electron app
npm run build:tauri      # Build Tauri app
npm run build:ui         # Build UI only

# Validation
npm run typecheck        # TypeScript check
```

## Integration Points

### API Communication
- HTTP routes for CRUD operations
- SSE for real-time events
- IPC for Electron communication

### File System
- File browser and search
- Workspace management
- Config persistence
