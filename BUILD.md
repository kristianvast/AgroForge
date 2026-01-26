# Building CodeNomad Binaries

Guide for building distributable binaries.

## Prerequisites

- **Node.js 18+** or **Bun**
- **electron-builder** (via devDependencies)

## Quick Start

From repo root:

```bash
npm run build
```

Or target the Electron package directly:

```bash
npm run build --workspace @neuralnomads/codenomad-electron-app
```

## Platform Builds

### macOS

```bash
npm run build:mac        # Universal (Intel + Apple Silicon)
npm run build:mac-x64    # Intel only
npm run build:mac-arm64  # Apple Silicon only
```

Output: `.dmg`, `.zip`

### Windows

```bash
npm run build:win        # x64
npm run build:win-arm64  # ARM64
```

Output: `.exe` (NSIS installer), `.zip`

### Linux

```bash
npm run build:linux        # x64
npm run build:linux-arm64  # ARM64
```

Output: `.AppImage`, `.deb`, `.tar.gz`

### All Platforms

```bash
npm run build:all
```

Note: Cross-platform builds have limitations. Build on target platform for best results.

## Build Process

1. **Build @neuralnomads/codenomad-server** → CLI bundle + UI assets
2. **Compile TypeScript + Vite bundle** → Electron main, preload, renderer
3. **Package with electron-builder** → Platform binaries

## Output

Binaries go to `release/`:

```
release/
├── CodeNomad-0.9.1-mac-universal.dmg
├── CodeNomad-0.9.1-win-x64.exe
├── CodeNomad-0.9.1-linux-x64.AppImage
└── ...
```

## File Naming

```
CodeNomad-{version}-{os}-{arch}.{ext}
```

## Troubleshooting

### macOS build fails

```bash
xcode-select --install
```

### Linux build fails

```bash
# Debian/Ubuntu
sudo apt-get install -y rpm

# Fedora
sudo dnf install -y rpm-build
```

### "electron-builder not found"

```bash
npm install
```

## Brand Assets

- `images/CodeNomad-Icon.png` — master icon (1024x1024)

To regenerate icons:

```bash
node scripts/generate-icons.js images/CodeNomad-Icon.png electron/resources
```

## Clean Build

```bash
rm -rf release/ dist/
npm run build
```
