# CodeNomad Desktop

The native desktop app for CodeNomad, built with [Electron](https://www.electronjs.org/).

## Overview

Wraps the UI and Server into a standalone executable with:
- Native window management
- Global keyboard shortcuts
- System menu integration
- Tray support

## Development

To run the Electron app in development mode:

```bash
npm run dev
```

This will start the renderer (UI) and the main process with hot reloading.

## Building

To build the application for your current platform:

```bash
npm run build
```

To build for specific platforms (requires appropriate build tools):

- **macOS**: `npm run build:mac`
- **Windows**: `npm run build:win`
- **Linux**: `npm run build:linux`

## Structure

- `electron/main`: Main process code (window creation, IPC).
- `electron/preload`: Preload scripts for secure bridge between main and renderer.
- `electron/resources`: Static assets like icons.
