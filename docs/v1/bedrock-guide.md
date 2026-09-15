# Bedrock Dedicated Server (BDS) Technical Guide

A reference manual on the internal architecture, network protocols, file formats, and backup mechanisms of official **Mojang Minecraft Bedrock Dedicated Server (BDS)**.

---

## 1. The Bedrock Server Binary

Official Bedrock Dedicated Server (BDS) is written in native C++ and distributed by Mojang for two platforms:
* **Linux**: `bedrock_server` (64-bit ELF executable compiled for Ubuntu 20.04/22.04 LTS).
* **Windows**: `bedrock_server.exe` (64-bit PE executable).

### Linux Execution Quirks
BDS relies on bundled dynamic shared libraries located in its root folder. On Linux, it must be launched with:
```bash
LD_LIBRARY_PATH=. ./bedrock_server
```
Required system dependencies include `libcurl4`, `libssl`, and `glibc >= 2.31`.

---

## 2. Networking: RakNet & UDP Protocol

Unlike Minecraft Java Edition which communicates over **TCP (port 25565)**, Minecraft Bedrock communicates over **UDP using the RakNet protocol**:

| Setting | Default Value | Description |
| :--- | :--- | :--- |
| `server-port` | `19132` | Primary IPv4 UDP port for Bedrock clients |
| `server-portv6` | `19133` | Primary IPv6 UDP port for Bedrock clients |

### Unconnected Ping / Pong (Status Query)
Bedrock clients and server monitors discover server status using RakNet **Unconnected Ping (`0x01`)** packets. The server responds with an **Unconnected Pong (`0x1c`)** payload formatted as a semicolon-delimited string:

```text
MCPE;Fabricator Bedrock Realm;729;1.21.60;4;10;1384910248102948;BedrockLevel;Survival;1;19132;19133;
```

#### Fields Breakdown:
1. `MCPE` (Minecraft Pocket Edition signature)
2. Server Name / MOTD (`Fabricator Bedrock Realm`)
3. Protocol Version (e.g. `729`)
4. Game Version (e.g. `1.21.60`)
5. Current Online Players (`4`)
6. Max Players (`10`)
7. Server Unique GUID (`1384910248102948`)
8. Level Name (`BedrockLevel`)
9. Game Mode (`Survival`)
10. Hardcore status (`0` or `1`)
11. IPv4 Port (`19132`)
12. IPv6 Port (`19133`)

---

## 3. World Storage: LevelDB & The Hot Backup Protocol

Minecraft Bedrock does **not** use the Anvil / MCA region format. Instead, worlds are stored as a **Google LevelDB** key-value database in `worlds/<level_name>/db/`.

> [!CAUTION]
> **LevelDB Corruption Warning**  
> If you copy world files while BDS is running without using the `save hold` command, the LevelDB transaction log (`LOG`, `MANIFEST-*`, `*.ldb`) will be copied in an inconsistent state, leading to **unrecoverable chunk corruption**.

### The Mojang Safe Hot Backup Sequence

BDS provides built-in console commands specifically designed for backup tools:

```
[1] User or Cron triggers backup
           │
           ▼
[2] Send command: "save hold" ──────────► BDS pauses world disk writes
           │
           ▼
[3] Send command: "save query" ─────────► BDS returns file list & byte lengths
           │                              (e.g., db/000124.ldb:4194304, level.dat:2048)
           ▼
[4] Backup script copies only
    designated files up to byte lengths
           │
           ▼
[5] Send command: "save resume" ────────► BDS unholds writes and resumes normal DB operations
           │
           ▼
[6] Compressed .zip archive stored safely!
```

---

## 4. Player Authentication & Permission Formats

### Player Identity: XUID
When `online-mode=true`, players authenticate with Microsoft Xbox Live. Each account has:
- A human-readable **Gamertag** (e.g. `AlexCraft`).
- An immutable 16-digit **XUID** (e.g. `2533274819201940`).

### `allowlist.json` (Whitelist)
Located in the server root. Controls who can connect when `white-list=true` in `server.properties`:
```json
[
  {
    "name": "AlexCraft",
    "xuid": "2533274819201940",
    "ignoresPlayerLimit": true
  },
  {
    "name": "SteveMiner",
    "xuid": "2533274910482012",
    "ignoresPlayerLimit": false
  }
]
```

### `permissions.json` (Operator & Roles)
Defines player privilege levels:
```json
[
  {
    "permission": "operator",
    "xuid": "2533274819201940"
  },
  {
    "permission": "visitor",
    "xuid": "2533290019482711"
  }
]
```

---

## 5. Add-ons & Pack Architecture

Bedrock modifications are packaged as `.mcpack` or `.mcaddon` files (which are standard `.zip` archives).

### Pack Types:
1. **Behavior Pack (`behavior_packs/`)**:
   - Contains server-side game mechanics, custom entities, loot tables, and GameTest scripts.
2. **Resource Pack (`resource_packs/`)**:
   - Contains client-side textures, models, geometry, and sounds.

### `manifest.json` Specification
Every pack must have a `manifest.json` in its root folder:
```json
{
  "format_version": 2,
  "header": {
    "name": "Custom Waypoints",
    "description": "Fast travel obelisks for survival",
    "uuid": "7193ab20-410a-4284-884a-1049281a9821",
    "version": [1, 2, 0],
    "min_engine_version": [1, 21, 0]
  },
  "modules": [
    {
      "type": "data",
      "uuid": "82019ab3-201a-491a-a820-91029482910a",
      "version": [1, 2, 0]
    }
  ]
}
```

### Enabling Packs in a World
To activate a pack, its header UUID and version must be registered in the world's pack manifests:
- `worlds/<level_name>/world_behavior_packs.json`
- `worlds/<level_name>/world_resource_packs.json`

```json
[
  {
    "pack_id": "7193ab20-410a-4284-884a-1049281a9821",
    "version": [1, 2, 0]
  }
]
```
