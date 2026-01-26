# CodeNomad UI

The frontend for CodeNomad, built with [SolidJS](https://www.solidjs.com/) and [Tailwind CSS](https://tailwindcss.com/).

## Overview

Fast, reactive interface designed for long coding sessions. Connects to the CodeNomad server (standalone or embedded in the desktop app).

## Features

- **SolidJS**: Fine-grained reactivity for high performance.
- **Tailwind CSS**: Utility-first styling for rapid development.
- **Vite**: Fast build tool and dev server.

## Development

To run the UI in standalone mode (connected to a running server):

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:3000`.

## Building

To build the production assets:

```
npm run build
```

The output will be generated in the `dist` directory, which is then consumed by the Server or Electron app.

## Debug Logging

The UI now routes all logging through a lightweight wrapper around [`debug`](https://github.com/debug-js/debug). The logger exposes four namespaces that can be toggled at runtime:

- `sse` – Server-sent event transport and handlers
- `api` – HTTP/API calls and workspace lifecycle
- `session` – Session/model state, prompt handling, tool calls
- `actions` – User-driven interactions in UI components

You can enable or disable namespaces from DevTools via the global `window.codenomadLogger` helpers:

```js
window.codenomadLogger?.listLoggerNamespaces() // => [{ name: "sse", enabled: false }, ...]
window.codenomadLogger?.enableLogger("sse")    // turn on SSE logs
window.codenomadLogger?.disableLogger("sse")   // turn them off
window.codenomadLogger?.enableAllLoggers()     // enable everything
```

Enabled namespaces persist in `localStorage` under `codenomad:logger:namespaces`.

