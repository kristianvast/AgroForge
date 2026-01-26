# AgroForge 🌱⚒️

> Cultivating code, one session at a time.

A desktop environment for developers who spend hours in [OpenCode](https://opencode.ai). Not a thin wrapper—a proper cockpit with tabs, keyboard-first navigation, and the muscle to handle sessions with thousands of messages.

Built by [Kristian Vastveit](https://github.com/kristianvast).

![Multi-instance workspace](docs/screenshots/newSession.png)

<details>
<summary>More screenshots</summary>

![Command palette](docs/screenshots/command-palette.png)

![Image previews](docs/screenshots/image-previews.png)

![Browser support](docs/screenshots/browser-support.png)

</details>

---

## Why AgroForge?

OpenCode is powerful, but managing long sessions across multiple projects felt clunky. I wanted:

- **Tabs** — Jump between projects without losing context
- **Speed** — Scroll through 10k+ message sessions without lag
- **Keyboard everything** — Command palette, shortcuts, no mouse required
- **Remote access** — Code from my laptop while the heavy lifting runs on my workstation

So I built it.

---

## Quick Start

### Desktop App (Recommended)

Download for your platform:

**[Releases Page](https://github.com/kristianvast/AgroForge/releases)** — macOS, Windows, Linux

### Run as Server

Access AgroForge from any browser. Great for remote dev or headless setups:

```bash
npx @agroforge/server --launch
```

### Tauri Build (Experimental)

Lighter alternative using Rust + WebKitGTK. Check releases for builds.

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

Monorepo with npm workspaces:

```
packages/
├── electron-app/   # Desktop shell (Electron)
├── tauri-app/      # Lightweight shell (Tauri, experimental)
├── server/         # CLI server + workspace management
└── ui/             # SolidJS frontend
```

### Build from source

```bash
git clone https://github.com/kristianvast/AgroForge.git
cd AgroForge
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
xattr -dr com.apple.quarantine /Applications/AgroForge.app
```

</details>

<details>
<summary>Linux + Wayland + NVIDIA: Tauri crashes on launch</summary>

WebKitGTK can struggle with DMA-BUF on some setups:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 agroforge
```

See: https://github.com/tauri-apps/tauri/issues/10702

</details>

---

## Credits

AgroForge is a fork of **[CodeNomad](https://github.com/neuralnomads/codenomad)** by [NeuralNomads](https://github.com/neuralnomads). Thanks for the solid foundation—I've since taken it in my own direction with custom features, UI improvements, and architectural changes.

---

## License

MIT
