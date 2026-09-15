# System Overview & Architecture (v1.0.0)

This document details the system design, architecture, and technology choices for **Bedrock Server Manager**, a web management panel for Minecraft Bedrock Dedicated Server (BDS) inspired by [Fabricator](https://docs.fabricator.site/).

---

## 1. Motivation & Background

Minecraft server management dashboards traditionally target the Java Edition ecosystem (Paper, Fabric, Forge, Purpur). However, **Minecraft Bedrock Dedicated Server (BDS)** is fundamentally different:

| Aspect | Java Edition (Fabricator Target) | Bedrock Dedicated Server (BDS) |
| :--- | :--- | :--- |
| **Runtime Binary** | Java bytecode (`.jar`) executed via JVM | Native C++ compiled binary (`bedrock_server.exe` / ELF binary) |
| **World Storage** | Anvil / MCA region files | **LevelDB** key-value database |
| **Network Protocol** | TCP (default port 25565) | **UDP (RakNet)** (default port 19132) |
| **Modding Format** | Java JAR files (Fabric/Forge/NeoForge) | **Behavior & Resource Packs** (`.mcpack`, `.mcaddon`) |
| **Player Identity** | UUID (Mojang session auth) | **XUID** (16-digit Xbox Live Unique Identifier) |
| **Backup Requirement**| Simple file copy / rsync | **Hot protocol** (`save hold`/`save query`) to prevent LevelDB write corruption |

Bedrock Server Manager is engineered specifically around these Bedrock requirements.

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WEB CLIENT (React 19 + Vite)                     │
│  Base UI (@base-ui/react)  •  shadcn Nova Style  •  Tailwind CSS v4     │
│             xterm.js Terminal  •  Zustand State Store                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / WebSocket (WS) (Port 3001)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    MANAGEMENT DAEMON / SUPERVISOR                      │
│   Fastify / Node.js  •  BdsSupervisor  •  Mojang BdsInstaller          │
│          /ws/console WebSocket Bridge  •  LevelDB Hot Backups          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ stdin/stdout stream            │ UDP RakNet Ping
┌───────────────────▼──────────────────┐   ┌─────────▼───────────────────┐
│  bedrock_server.exe (Native C++)     │   │     playit.gg Tunnel Agent  │
│  worlds/ (LevelDB)  •  packs/        │   │    (NAT Traversal UDP 19132)│
└──────────────────────────────────────┘   └─────────────────────────────┘
```

---

## 3. Technology Stack Breakdown

### Backend: Node.js + Fastify + TypeScript (`packages/server`)
* **Fastify 5**: High-performance HTTP and WebSocket framework with low overhead.
* **BdsSupervisor**: Native child process manager providing lifecycle tracking (`offline`, `starting`, `online`, `stopping`), stdout buffering, and graceful `stop` command sequences.
* **BdsInstaller**: Automatic binary provisioner that queries official Mojang discovery endpoints (`https://net-secondary.web.minecraft-services.net/api/v1.0/download/links`) to fetch and unpack the latest `bedrock_server.exe` / Linux binary.
* **WebSocket Console Bridge**: Fastify WebSocket handler at `/ws/console` broadcasting live stdout events and receiving client command submissions.

### Frontend: React 19 + TypeScript + Vite (`packages/web`)
* **React 19**: Modern component architecture with clean hooks, context, and state handling.
* **Vite 8**: Fast development server with sub-second hot module replacement (HMR) and built-in proxy forwarding `/api` and `/ws` to port 3001.
* **UI Primitives**: Official **Base UI** (`@base-ui/react`) headless components with the compact **shadcn Nova style** (`base-nova`).
* **Terminal**: Hardware-accelerated `@xterm/xterm` connected directly to the daemon's WebSocket stream.
* **State Management**: Zustand store (`src/stores/serverStore.ts`) synchronizing with backend REST endpoints and socket events.

---

## 4. Directory Layout

```text
bedrock-client/
├── package.json                         # Monorepo root workspace scripts
├── README.md                            # Project overview and quickstart
├── bds/                                 # BDS runtime directory
│   ├── bedrock_server.exe               # Official Mojang BDS binary
│   ├── server.properties                # Native server configuration
│   ├── allowlist.json                   # Whitelisted players
│   ├── permissions.json                 # Player roles
│   └── worlds/                          # LevelDB world saves
├── docs/                                # Documentation v1
│   ├── v1/overview.md                   # This document
│   ├── v1/features.md                   # Feature guide
│   ├── v1/bedrock-guide.md              # BDS technical manual
│   └── v1/api-reference.md              # REST & WebSocket API specification
└── packages/
    ├── server/                          # Backend Fastify Daemon
    │   ├── src/
    │   │   ├── bds/                     # Supervisor and Installer
    │   │   ├── routes/                  # Server lifecycle REST routes
    │   │   ├── ws/                      # WebSocket terminal handler
    │   │   └── index.ts                 # Fastify bootstrap
    │   └── package.json
    └── web/                             # React Web Client
        ├── src/
        │   ├── stores/                  # Zustand store (serverStore.ts)
        │   ├── components/ui/           # Base UI Nova primitives
        │   └── views/                   # Dashboard, Console, Players, etc.
        └── package.json
```
