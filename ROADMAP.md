# Project Roadmap & Deferred Technical Specifications

This document tracks planned features, pending architectural enhancements, and deferred integrations for the Bedrock Server Manager.

---

## 📌 Deferred: Native playit.gg Bedrock Tunnel Integration

> **Status**: Deferred / Planned for Next Milestone  
> **Current State**: The frontend provides a visual preview and layout in `packages/web/src/views/TunnelsView.tsx`, operating in simulation mode.

### Objective
Provide automated, zero-configuration global public multiplayer access for Minecraft Bedrock Dedicated Server without requiring users to configure port forwarding, dynamic DNS, or static IP addresses on their home routers.

---

### Technical Specification & Design

#### 1. Binary Management (`packages/server/src/services/tunnelService.ts`)
* **Downloader**:
  * Fetch official standalone release from GitHub:  
    `https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-win-x86_64.exe` (Windows) or Linux ELF.
  * Store executable under `bds/bin/playit.exe`.
* **Supervisor**:
  * Supervise process lifecycle alongside BDS:
    ```bash
    bds/bin/playit.exe --secret_path bds/playit-secret.toml
    ```
  * Monitor process health, auto-restart on unexpected crashes, and gracefully terminate on server exit.

#### 2. Claim URL & Tunnel Provisioning
* **First-Time Setup**:
  * When launched without an existing `playit-secret.toml`, `playit-agent` outputs a unique pairing URL in its stdout:
    `https://playit.gg/claim/<claim-token>`
  * `TunnelService` regex extracts this claim URL and sends it to the frontend.
  * The user opens the link in their browser to link the server to their playit.gg account.
* **Automatic Tunnel Setup**:
  * Using the playit.gg API or interactive claim, a **Minecraft Bedrock UDP** tunnel is bound to `127.0.0.1:19132`.
  * playit.gg assigns a dedicated Anycast address (e.g. `bedrock-realm.gl.at.ply.gg:19132`).
  * `TunnelService` parses the confirmed tunnel allocation and broadcasts status over WebSocket.

#### 3. Backend REST Endpoints (`packages/server/src/routes/tunnelRoutes.ts`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tunnel/status` | Returns `{ active: boolean, status: string, claimUrl?: string, assignedAddress?: string, assignedPort?: number, latencyMs?: number }` |
| `POST` | `/api/tunnel/start` | Spawns and attaches `playit.exe` process |
| `POST` | `/api/tunnel/stop` | Gracefully shuts down `playit.exe` |
| `POST` | `/api/tunnel/reset` | Deletes `playit-secret.toml` to unlink and generate a fresh claim code |

#### 4. Frontend Integration (`packages/web/src/views/TunnelsView.tsx`)
* Replace simulated state in `serverStore.ts` with real API queries (`fetchTunnelStatus`, `startTunnel`, `stopTunnel`).
* If `claimUrl` is present:
  * Show a prominent alert banner with a **"Claim playit.gg Agent"** button.
* Once active:
  * Show real live hostname and port with one-click copy.
  * Live ping latency graph to Anycast tunnel nodes.
  * Instructions for mobile, console, and desktop Bedrock players.

---

## 📋 Other Planned Features (Future Phases)

1. **Discord Bot / Webhook Notification System**:
   - Webhook alerts for: Server online/offline, player joins/leaves, automated snapshot completions, and high memory/CPU alarms.
2. **Multi-World Manager**:
   - Easily switch between multiple world folders, seed generators, and template worlds (`world_templates/`).
3. **Automated Bedrock Version Updater**:
   - Check Mojang CDN periodically for BDS engine updates and one-click migrate world data.
