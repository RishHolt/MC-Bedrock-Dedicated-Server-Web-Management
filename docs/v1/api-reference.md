# Bedrock Server Manager API Reference (v1.0.0)

The backend supervisor daemon exposes REST endpoints and real-time WebSocket channels on port `3001` (proxied via Vite on port `5173`).

---

## 1. WebSocket Console Endpoint

### `GET /ws/console`
Interactive bi-directional WebSocket connection streaming the Bedrock Dedicated Server stdin/stdout.

#### Messages Received from Server:
```jsonc
// 1. Initial connection payload
{
  "type": "init",
  "state": "online", // "offline" | "starting" | "online" | "stopping"
  "logs": [
    "[INFO] Starting Server",
    "[INFO] Server started."
  ],
  "metrics": {
    "cpuPercent": 8.5,
    "ramUsedMB": 420,
    "uptimeSeconds": 124,
    "activePlayers": 0,
    "maxPlayers": 10
  }
}

// 2. Real-time stdout log event
{
  "type": "log",
  "data": "[2026-09-15 11:10:30:720 INFO] Set the time to 1000"
}

// 3. Lifecycle state transition event
{
  "type": "state",
  "data": "online" // "offline" | "starting" | "online" | "stopping"
}
```

#### Messages Sent to Server:
```jsonc
// Submit Bedrock command to BDS stdin
{
  "type": "command",
  "command": "time set day"
}
```

---

## 2. Server Lifecycle REST Endpoints

### `GET /api/server/status`
Returns the current lifecycle state, binary installation status, and runtime metrics.

**Response (200 OK):**
```json
{
  "state": "online",
  "installed": true,
  "binaryPath": "C:\\Users\\...\\bds\\bedrock_server.exe",
  "bdsDirectory": "C:\\Users\\...\\bds",
  "metrics": {
    "cpuPercent": 8.5,
    "ramUsedMB": 420,
    "uptimeSeconds": 240,
    "activePlayers": 0,
    "maxPlayers": 10
  }
}
```

---

### `POST /api/server/start`
Launches `bedrock_server.exe` inside the supervisor child process with piped standard I/O.

**Response (200 OK):**
```json
{
  "success": true,
  "state": "starting"
}
```

---

### `POST /api/server/stop`
Sends a graceful `stop\r\n` command through BDS stdin, allowing LevelDB database transactions to complete before process exit.

**Response (200 OK):**
```json
{
  "success": true,
  "state": "stopping"
}
```

---

### `POST /api/server/restart`
Gracefully stops the active server and boots it again after process exit.

**Response (200 OK):**
```json
{
  "success": true,
  "state": "stopping"
}
```

---

### `POST /api/server/kill`
Immediately terminates the BDS process tree (`taskkill /F /T` on Windows or `SIGKILL` on Linux).

**Response (200 OK):**
```json
{
  "success": true,
  "state": "offline"
}
```

---

### `POST /api/server/command`
Submits a Bedrock slash command directly to server stdin.

**Request Body:**
```json
{
  "command": "time set day"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "command": "time set day"
}
```

---

### `GET /api/server/logs`
Returns the recent rolling backlog of server console output lines (up to 1,000 lines).

**Response (200 OK):**
```json
{
  "logs": [
    "[INFO] Starting Server",
    "[INFO] Opening level 'worlds/Bedrock level/db'",
    "[INFO] IPv4 supported, port: 19132",
    "[INFO] Server started."
  ]
}
```

---

### `POST /api/server/install`
Triggers dynamic discovery and installation of official Mojang BDS binaries via Mojang service APIs.

---

## 3. Configuration Endpoints (`server.properties`)

### `GET /api/config`
Parses and returns all active key-value pairs from `server.properties` with type coercion (numbers, booleans, strings).

**Response (200 OK):**
```json
{
  "config": {
    "server-name": "Bedrock Dedicated Server",
    "gamemode": "survival",
    "difficulty": "easy",
    "allow-cheats": false,
    "max-players": 10,
    "online-mode": true,
    "allow-list": false,
    "server-port": 19132,
    "server-portv6": 19133,
    "view-distance": 32,
    "tick-distance": 4,
    "player-idle-timeout": 30,
    "max-threads": 8,
    "level-name": "Bedrock level",
    "level-seed": "",
    "default-player-permission-level": "member",
    "texturepack-required": false,
    "content-log-file-enabled": false
  }
}
```

---

### `POST /api/config`
Updates one or more properties in `server.properties` while preserving existing comments and untouched keys.

**Request Body:**
```json
{
  "difficulty": "normal",
  "max-players": 15,
  "allow-cheats": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "config": { /* updated configuration */ }
}
```

---

### `GET /api/config/raw`
Returns the verbatim text content of `server.properties` with all native Mojang comments intact. `Content-Type: text/plain; charset=utf-8`.

---

### `POST /api/config/raw`
Replaces the verbatim contents of `server.properties` with new text. Accepts raw text or JSON `{ "content": "..." }`.

---

## 4. Safe LevelDB Backup Endpoints

### `GET /api/backups`
Returns an array of all saved backup archives stored in `bds/backups/`, sorted newest first.

**Response (200 OK):**
```json
{
  "backups": [
    {
      "id": "bedrock-hot-2026-09-15T03-24-10",
      "filename": "bedrock-hot-2026-09-15T03-24-10.zip",
      "sizeBytes": 8540120,
      "createdAt": "9/15/2026, 11:24:10 AM",
      "type": "hot_leveldb",
      "worldName": "Bedrock level"
    }
  ]
}
```

---

### `POST /api/backups/create`
Triggers world snapshot creation.
- If `type: "hot_leveldb"` and server is running: sends `save hold` ➔ polls `save query` ➔ archives world ➔ sends `save resume`.
- If `type: "cold_archive"`: archives world directory without hold protocol.
- Optional `customTag` creates a descriptive filename: `bedrock-[hot|cold]-[timestamp]_[customTag].zip`.

**Request Body:**
```json
{
  "type": "hot_leveldb", // or "cold_archive"
  "customTag": "before-boss-fight" // optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "backup": {
    "id": "bedrock-hot-2026-09-15T03-34-18_before-boss-fight",
    "filename": "bedrock-hot-2026-09-15T03-34-18_before-boss-fight.zip",
    "sizeBytes": 8540120,
    "createdAt": "9/15/2026, 11:34:18 AM",
    "type": "hot_leveldb",
    "worldName": "Bedrock level",
    "tag": "before-boss-fight"
  }
}
```

---

### `GET /api/backups/schedule`
Returns the automated recurring backup configuration and the projected `nextRunAt` timestamp.

**Response (200 OK):**
```json
{
  "schedule": {
    "enabled": true,
    "frequency": "daily", // "interval" | "daily" | "weekly" | "monthly" | "cron"
    "intervalHours": 6,
    "timeOfDay": "04:00",
    "daysOfWeek": [0],
    "dayOfMonth": 1,
    "cronExpression": "0 4 * * *",
    "maxRetainedBackups": 10,
    "lastRunAt": "2026-09-15T03:34:18.000Z",
    "nextRunAt": "2026-09-15T20:00:00.000Z"
  }
}
```

---

### `POST /api/backups/schedule`
Updates recurring backup schedule configuration. The background runner evaluates schedule ticks every 60 seconds and auto-prunes backups exceeding `maxRetainedBackups`.

**Request Body:**
```json
{
  "enabled": true,
  "frequency": "weekly",
  "timeOfDay": "03:00",
  "daysOfWeek": [0, 3], // Sunday and Wednesday
  "maxRetainedBackups": 10
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "schedule": {
    /* updated schedule object with nextRunAt */
  }
}
```

---

### `POST /api/backups/:id/restore`
Restores the specified backup archive to the active world directory.
- If server is running, gracefully stops it first to unlock LevelDB files.
- Extracts backup archive to `bds/worlds/<level-name>`.
- Restarts server if it was running.

**Response (200 OK):**
```json
{
  "success": true,
  "restoredId": "bedrock-hot-2026-09-15T03-34-18"
}
```

---

### `DELETE /api/backups/:id`
Permanently deletes the specified `.zip` backup archive from `bds/backups/`.

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### `GET /api/backups/:id/download`
Streams the `.zip` archive as a direct browser attachment with `Content-Disposition: attachment; filename="<id>.zip"`.

---

## 5. Sandboxed File Manager Endpoints

All file operations are strictly scoped to the `bds/` root directory. Requests containing path traversal characters (`..`, `/`, `\\`) that attempt to escape `bds/` are rejected with `400 Bad Request`.

### `GET /api/files/list`
Lists directory contents for a relative path.

**Query Parameters:**
- `path`: (Optional, default `/`) Relative path inside `bds/`.

**Response (200 OK):**
```json
{
  "success": true,
  "path": "/",
  "files": [
    {
      "name": "worlds",
      "path": "/worlds",
      "type": "directory",
      "sizeBytes": 0,
      "modifiedAt": "9/15/2026, 11:15:00 AM"
    },
    {
      "name": "server.properties",
      "path": "/server.properties",
      "type": "file",
      "sizeBytes": 13426,
      "modifiedAt": "9/15/2026, 11:20:00 AM",
      "extension": "properties"
    }
  ]
}
```

---

### `GET /api/files/read`
Reads verbatim text content of a file within `bds/`.

**Query Parameters:**
- `path`: (Required) e.g. `/server.properties` or `/permissions.json`.

**Response (200 OK):**
```json
{
  "success": true,
  "path": "/server.properties",
  "content": "server-name=Dedicated Server\n..."
}
```

---

### `POST /api/files/write`
Creates or updates a file within `bds/`. Automatically creates parent directories if needed.

**Request Body:**
```json
{
  "path": "/config/rules.txt",
  "content": "1. No griefing\n2. Be respectful\n"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "path": "/config/rules.txt"
}
```

---

### `POST /api/files/mkdir`
Creates a new directory within `bds/`.

**Request Body:**
```json
{
  "path": "/logs"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "path": "/logs"
}
```

---

### `DELETE /api/files`
Deletes a file or directory within `bds/`. Accepts relative path via `?path=...` query param or JSON `{ "path": "..." }` body.

**Response (200 OK):**
```json
{
  "success": true,
  "path": "/test.txt"
}
```

---

### `GET /api/files/download`
Streams a file directly as an attachment.

**Query Parameters:**
- `path`: (Required) Relative file path.
