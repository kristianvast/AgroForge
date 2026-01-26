# CodeNomad

> Your command center for marathon AI coding sessions.

CodeNomad is a desktop environment for developers who spend hours deep in [OpenCode](https://opencode.ai). Not another thin wrapper—a proper cockpit with tabs, keyboard-first navigation, and the performance to handle sessions with thousands of messages.

Built by [Kristian Vastveit](https://github.com/kristianvast) as a personal tool that grew into something worth sharing.

![Multi-instance workspace](docs/screenshots/newSession.png)

<details>
<summary>More screenshots</summary>

![Command palette](docs/screenshots/command-palette.png)

![Image previews](docs/screenshots/image-previews.png)

![Browser support](docs/screenshots/browser-support.png)

</details>

---

## Why CodeNomad?

I kept running into the same friction: OpenCode is powerful, but managing long sessions across multiple projects felt clunky. I wanted:

- **Tabs** — Jump between projects without losing context
- **Speed** — Scroll through 10k+ message sessions without lag
- **Keyboard everything** — Command palette, shortcuts, no mouse required
- **Remote access** — Code from my laptop while the heavy lifting runs on my workstation

So I built it.

---

## Quick Start

### Desktop App (Recommended)

Download the latest release for your platform:

- **[Releases Page](https://github.com/kristianvast/CodeNomad/releases)** — macOS, Windows, Linux

### Run as Server

Access CodeNomad from any browser. Great for remote dev or headless setups:

```bash
npx @neuralnomads/codenomad-server --launch
```

### Tauri Build (Experimental)

Lighter weight alternative using Rust + WebKitGTK:

```bash
# Check releases for Tauri builds
```

---

## Features

| What | Why it matters |
|------|----------------|
| **Multi-instance tabs** | Work on multiple projects simultaneously |
| **Command palette** | `Cmd/Ctrl+K` for everything |
| **Long-session performance** | Handles massive transcripts without choking |
| **Background task awareness** | See child sessions and async work at a glance |
| **File attachments** | Drag, drop, or `@mention` files inline |
| **Image support** | Paste screenshots, preview assets |
| **Agent switching** | Swap agents and models mid-session |
| **Remote access** | Run the server, connect from anywhere |

---

## Requirements

- **[OpenCode CLI](https://opencode.ai)** — installed and in your `PATH`
- **Node.js 18+** — if running the server or building from source

---

## Development

This is a monorepo with npm workspaces:

```
packages/
├── electron-app/   # Desktop shell (Electron)
├── tauri-app/      # Lightweight shell (Tauri, experimental)
├── server/         # CLI server + workspace management
└── ui/             # SolidJS frontend
```

### Build from source

```bash
git clone https://github.com/kristianvast/CodeNomad.git
cd CodeNomad
npm install
npm run build
```

### Run in dev mode

```bash
npm run dev          # Electron app
npm run dev:tauri    # Tauri app
```

---

## Troubleshooting

<details>
<summary>macOS says the app is damaged</summary>

Gatekeeper quarantines unsigned apps. Clear it:

```bash
xattr -dr com.apple.quarantine /Applications/CodeNomad.app
```

</details>

<details>
<summary>Linux + Wayland + NVIDIA: Tauri crashes on launch</summary>

WebKitGTK can struggle with DMA-BUF on some setups:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 codenomad
```

See: https://github.com/tauri-apps/tauri/issues/10702

</details>

---

## Credits

CodeNomad started as a fork of **[AgroForge](https://github.com/kristianvast/AgroForge)** and has since diverged significantly with custom features, UI improvements, and architectural changes. Thanks to the original project for the foundation.

---

## License

MIT
