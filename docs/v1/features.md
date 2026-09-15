# Features Guide (v1.0.0)

This guide provides a comprehensive walkthrough of the user-facing features available in the **Bedrock Server Manager** web dashboard.

---

## 1. Top Navbar & Lifecycle Power Controls

The sticky top navigation bar provides instant visual awareness and process controls regardless of which view you are on:

- **Server State Badge**: Shows live state (`online`, `starting`, `stopping`, `offline`, `updating`) with an animated glowing pulse dot.
- **Power Actions**:
  - `Start`: Launches the Bedrock Dedicated Server binary inside a dedicated PTY.
  - `Stop`: Sends a graceful `stop` command through stdin to ensure LevelDB commits writes to disk before process exit.
  - `Restart`: Gracefully stops the server and starts it again after process termination.
  - `Kill`: Forcefully sends `SIGKILL` (or `TerminateProcess` on Windows) if the server binary is hung.
- **Metrics Quick Pills**: Live CPU usage %, RAM consumption (MB), and player count (`active / max`).
- **Dark/Light Mode**: Toggle between high-contrast dark mode and clean light theme.

---

## 2. Overview / Dashboard (`DashboardView`)

The primary landing screen displaying overall server health and connection information:

* **Direct UDP Address Card**: Displays your server's local or public IP, default UDP port (`19132`), IPv6 port (`19133`), or playit.gg tunnel host with a one-click copy button.
* **Server Health Telemetry**:
  * **CPU Usage**: Real-time percentage with thread limit indication (`max-threads`).
  * **Memory (RAM)**: Real-time MB usage with visual progress bar against the allocated cap.
  * **TPS & Tick Duration**: Ticks per second (target 20.0 TPS) and millisecond duration per tick.
  * **Uptime Counter**: Hours and minutes elapsed since process launch.
* **Online Players Widget**: Quick roster of currently connected Xbox Live players with an instant "Kick" button.
* **Console Tail Stream**: The most recent 8 console stdout events with a button to jump into the full terminal.

---

## 3. Interactive Console (`ConsoleView`)

An ANSI-enabled terminal built on `@xterm/xterm` connected directly to the server binary's standard input and output streams:

* **ANSI Color Highlighting**:
  * Cyan: User-submitted commands (`> ...`).
  * Emerald: Player connection and chat messages.
  * Yellow: Server warnings (`[WARN]`).
  * Red: Errors and stack traces (`[ERROR]`).
  * Magenta: RakNet network events (`[RakNet]`).
* **Command Bar**:
  * History navigation using the **Up Arrow** and **Down Arrow** keys.
  * Autocomplete / quick suggestion chips for common Bedrock commands:
    * `help`, `list`
    * `time set day`, `weather clear`
    * `save hold`, `save query`, `save resume`
    * `whitelist on`, `gamemode survival @a`
* **Terminal Utilities**:
  * "Scroll to Bottom" button.
  * "Clear" button.
  * "Export" button to download console logs as a `.log` text file.

---

## 4. Player & Permission Management (`PlayersView`)

Minecraft Bedrock identifies players via **Xbox Live Gamertags** and 16-digit **XUIDs** (Xbox Unique Identifiers).

### Sub-tabs:
1. **Online Players**:
   * Shows active player names, XUIDs, assigned roles, and live ping in milliseconds.
   * Actions: Kick player, promote to Operator (`/op`), demote from Operator (`/deop`).
2. **Allowlist (`allowlist.json`)**:
   * View and search whitelisted players.
   * "Add to Allowlist" dialog: Enter an Xbox Gamertag and 16-digit XUID with optional "Ignore Player Limit" bypass.
   * Remove players from allowlist.
3. **Permissions & Ops (`permissions.json`)**:
   * Configures player privilege tiers:
     * **Visitor**: Can explore the world, but cannot break blocks, place blocks, or attack entities.
     * **Member**: Standard survival gameplay permissions.
     * **Operator**: Full administrative permissions with access to slash commands and cheat commands.

---

## 5. Server Configuration (`SettingsView`)

Manage all server parameters stored in the native `server.properties` file:

### Visual Form:
* **General**: Server Name (MOTD), Default Game Mode (Survival/Creative/Adventure), Difficulty (Peaceful/Easy/Normal/Hard), Allow Cheats, Require Resource Pack.
* **World**: World Name (folder in `worlds/`), World Seed, Default Permission level for new players.
* **Network**: IPv4 Port (19132 UDP), IPv6 Port (19133 UDP), Max Players, Online Mode (Xbox Live authentication).
* **Performance**: View Distance (chunks), Tick Distance (4 to 12 simulation radius), Max Threads, Player Idle Timeout.

### Raw Config Editor:
* Switch to the "Raw server.properties" tab to view and edit the exact text file.
* Includes two-way synchronization: edits made in the visual editor reflect in the raw text, and saving the raw text parses directly back into the dashboard state.

---

## 6. Add-ons & Pack Manager (`AddonsView`)

Bedrock modifications are distributed as **Resource Packs** (textures, models, audio, UI) and **Behavior Packs** (custom entities, scripts, components, recipes):

* **Drag-and-Drop Uploader**: Drop `.mcpack` or `.mcaddon` archives onto the upload zone. The manager extracts and inspects the inner `manifest.json`.
* **Pack Cards**: Shows pack title, author, version, UUID, file size, and descriptive summary.
* **Active World Toggles**: Toggle packs on or off. Toggling automatically updates `world_behavior_packs.json` and `world_resource_packs.json` in the active world folder.
* **Category Filters**: Filter between "All", "Behavior Packs", and "Resource Packs".

---

## 7. Safe Backups & Snapshots (`BackupsView`)

Because Bedrock worlds use **LevelDB**, copying files directly while the server is running causes database corruption. Bedrock Server Manager implements Mojang's native snapshot protocol:

* **Hot LevelDB Snapshot**:
  1. Sends `save hold` to server stdin.
  2. Polls with `save query` until Bedrock outputs the file manifest and byte lengths.
  3. Archives the consistent files into a compressed `.zip` snapshot.
  4. Sends `save resume` to unlock world writes.
  * Players remain connected with zero server downtime.
* **Cold Offline Archive**: Complete filesystem backup when the server is offline.
* **Custom Snapshot Tagging**:
  * Enter an optional label when taking a snapshot (e.g. `pre-boss-fight`, `v1.26-upgrade`).
  * Creates clean, easily identifiable filenames: `bedrock-[hot|cold]-[timestamp]_[label].zip`.
* **Automated Recurring Schedules (`backupScheduleService`)**:
  * **Interval**: Run every 1h, 3h, 6h, 12h, or 24h.
  * **Daily**: Run every day at a specific 24h time (e.g. `04:00` AM).
  * **Weekly**: Run on chosen days of the week (e.g. Sunday & Wednesday at `03:00` AM).
  * **Monthly**: Run on a specific day of the month (e.g. 1st of every month).
  * **Auto-Pruning / Retention Policy**: Automatically keeps the newest $N$ snapshots (e.g. 5, 10, 20) and deletes older automated backups.
  * **Live Countdown Indicator**: Real-time "Next scheduled snapshot in: X hours" preview on the dashboard.
* **Snapshot History**: Table with filename, world name, backup method, custom tag badges, creation timestamp, and file size.
* **Actions**: One-click download of `.zip` archive, safe world restore with automatic process stopping/restarting, and deletion.

---

## 8. File Manager (`FileManagerView`)

A safe, sandboxed file browser restricted to the Bedrock server directory:

* Breadcrumb directory navigation (`server_root`, `worlds/`, `behavior_packs/`, `resource_packs/`).
* File table with icons, file size, and last modified dates.
* **Inline File Editor**: Modal text editor for viewing and editing `.json`, `.properties`, `.txt`, and `.html` files without needing SSH or FTP.
* File upload and download capabilities.

---

## 9. playit.gg Tunnels (`TunnelsView`)

Direct integration for **playit.gg** NAT traversal:

* Creates an encrypted UDP tunnel from your local BDS server to playit.gg global routing nodes.
* Provides a public domain and port (e.g. `mc-bedrock.gl.at.ply.gg:25432`) that friends can use to join from anywhere without configuring router port forwarding.
* Includes connection instructions for mobile devices, Windows, and consoles.
