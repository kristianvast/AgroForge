# CodeNomad Server

The backend engine for CodeNomad. Manages OpenCode instances, serves the API, and provides real-time data streams.

## Features

### Remote Access
- Host on a powerful workstation, access from anywhere
- Tunnel via VPN/SSH for secure remote coding
- Works on tablets and mobile browsers

### Workspace Management
- Multi-instance support with per-project tabs
- Long-context performance for massive sessions
- Background task monitoring
- Command palette integration

## Prerequisites

- **OpenCode** installed and configured
- Node.js 18+
- A workspace folder to serve

## Usage

### Run via npx

```bash
npx @neuralnomads/codenomad-server --launch
```

### Install globally

```bash
npm install -g @neuralnomads/codenomad-server
codenomad --launch
```

### Flags

| Flag | Env Variable | Description |
|------|--------------|-------------|
| `--port <number>` | `CLI_PORT` | HTTP port (default 9898) |
| `--host <addr>` | `CLI_HOST` | Interface to bind (default 127.0.0.1) |
| `--workspace-root <path>` | `CLI_WORKSPACE_ROOT` | Default root for new workspaces |
| `--unrestricted-root` | `CLI_UNRESTRICTED_ROOT` | Allow full-filesystem browsing |
| `--config <path>` | `CLI_CONFIG` | Config file location |
| `--launch` | `CLI_LAUNCH` | Open UI in browser |
| `--log-level <level>` | `CLI_LOG_LEVEL` | Logging level |

### Data Storage

- **Config**: `~/.config/codenomad/config.json`
- **Instance Data**: `~/.config/codenomad/instances`

