# Bedrock Server Manager

A modern, self-hosted web management dashboard for **Minecraft Bedrock Dedicated Server**, inspired by [Fabricator](https://docs.fabricator.site/).

Built with **React 19**, **Base UI (`@base-ui/react`)**, **Fastify 5**, and styled with **shadcn** on **Tailwind CSS v4**.

---

## Windows System Tray Application (`BedrockServerManager.exe`)

You can run the entire server stack with zero visible terminal windows:

Double-click **`BedrockServerManager.exe`** in the project root:

- **No CMD Window**: Runs completely in the background without any command prompt or black terminal windows.
- **System Tray Icon**: Places a dedicated manager icon in your Windows Taskbar System Tray (notification area next to the clock).
- **Click to Open**: Left-clicking or double-clicking the tray icon immediately opens the web dashboard on `http://localhost:3001`.
- **Tray Context Menu** (Right-Click):
  - **Open Dashboard (Web App)**: Opens the web dashboard in your default browser.
  - **Live Status**: Displays real-time server state (`ONLINE` or `OFFLINE` on UDP port `19132`).
  - **Start Server**: Starts the BDS process.
  - **Stop Server (Graceful)**: Gracefully stops the server.
  - **Kill Server (Force)**: Terminates the server process.
  - **Quit Bedrock Manager**: Gracefully shuts down the server and exits the tray application.

---

## Key Highlights

- **Native C++ Binary Supervisor**: Real-time management of official Mojang `bedrock_server.exe` with stdout streaming and graceful shutdown.
- **Auto-Provisioning Engine**: Automatically queries official Mojang endpoints to download, extract, and configure the latest BDS releases.
- **Interactive xterm.js Terminal**: Bi-directional `/ws/console` WebSocket streaming directly to the browser with ANSI color formatting and command history.
- **Bedrock Protocol Support**: Handles UDP RakNet networking (default port `19132`), LAN discovery, and remote tunnels.
- **Safe LevelDB Hot Backups**: Non-destructive backups using Mojang's native `save hold` -> `save query` -> `save resume` protocol without disconnecting players.
- **Automated Backup Scheduling**: Configurable recurring backups (interval, daily, weekly, monthly) with automatic retention and pruning policies.
- **Xbox Live Identity & Permissions**: Manages players by **Xbox Gamertag** and 16-digit **XUID** across `allowlist.json` and `permissions.json`.
- **Add-on & Pack Installer**: Drag-and-drop installer for `.mcpack` and `.mcaddon` packages with automatic manifest parsing and world activation synchronization.
- **Server File Manager**: Full-featured web-based file browser and text editor for server configurations, logs, and pack manifests.
- **Toast Notifications & Confirmation Modals**: Real-time feedback across all operations with confirmation safeguards on destructive actions.
- **Persistent Theme Engine**: Emerald accent palette with persistent dark and light mode toggle.

---

## Architecture & Directory Structure

```
bedrock-client/
|-- BedrockServerManager.exe             # Native Windows GUI System Tray application
|-- bds/                                 # BDS runtime directory (git-ignored)
|-- docs/                                # Technical documentation
|   |-- v1/overview.md                   # System design & tech stack
|   |-- v1/features.md                   # Comprehensive feature guide
|   |-- v1/bedrock-guide.md              # Bedrock internals & LevelDB guide
|   `-- v1/api-reference.md              # REST & WebSocket API reference
`-- packages/
    |-- server/                          # Fastify 5 Backend Daemon (Port 3001)
    |   |-- src/bds/                     # BdsSupervisor & BdsInstaller
    |   `-- tray_app.cs                  # C# System Tray app source
    `-- web/                             # React 19 Frontend Dashboard
        `-- src/views/                   # Dashboard, Console, Players, Settings, etc.
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- npm v10 or higher
- Windows 10/11 (for the System Tray executable; web and server packages are cross-platform)

### Installation & Build

```bash
# 1. Install workspace dependencies
npm install

# 2. Build the web dashboard & server
npm run build

# 3. Launch via System Tray:
.\BedrockServerManager.exe
```

### Development Mode

To run frontend and backend development services separately:

```bash
# Terminal 1: Backend daemon (http://localhost:3001)
npm run server

# Terminal 2: Frontend Vite dev server (http://localhost:5173)
npm run dev
```

To recompile the System Tray executable from source:

```bash
npm run build:exe
```

---

## Documentation

For complete technical specifications, see the documentation guides:

- [System Architecture & Overview](docs/v1/overview.md)
- [Comprehensive Feature Guide](docs/v1/features.md)
- [Bedrock Dedicated Server Technical Guide](docs/v1/bedrock-guide.md)
- [REST & WebSocket API Reference](docs/v1/api-reference.md)
- [Project Roadmap](ROADMAP.md)

---

## License

MIT License. Built for the Minecraft Bedrock community.
