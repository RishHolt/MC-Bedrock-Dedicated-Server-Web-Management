import { create } from 'zustand'
import type { AddonPack, BackupRecord, BackupSchedule, BedrockConfig, FileItem, Player, ServerMetrics, ServerState, TunnelStatus } from '@/types/server'

export interface ServerStore {
  serverState: ServerState
  metrics: ServerMetrics
  config: BedrockConfig
  rawConfig: string
  players: Player[]
  allowlist: Player[]
  packs: AddonPack[]
  backups: BackupRecord[]
  schedule: BackupSchedule
  files: FileItem[]
  currentPath: string
  tunnel: TunnelStatus
  activeTab: string
  logs: string[]
  wsConnected: boolean
  
  // Actions
  initWs: () => void
  fetchStatus: () => Promise<void>
  setActiveTab: (tab: string) => void
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
  restartServer: () => Promise<void>
  killServer: () => Promise<void>
  sendCommand: (cmd: string) => void

  // Configuration (Phase 2)
  fetchConfig: () => Promise<void>
  fetchRawConfig: () => Promise<string>
  updateConfig: <K extends keyof BedrockConfig>(key: K, value: BedrockConfig[K]) => void
  saveConfig: () => Promise<boolean>
  saveRawConfig: (content: string) => Promise<boolean>

  // LevelDB Backups & Schedules (Phase 2)
  fetchBackups: () => Promise<void>
  fetchBackupSchedule: () => Promise<void>
  saveBackupSchedule: (config: Partial<BackupSchedule>) => Promise<boolean>
  createBackup: (type: 'hot_leveldb' | 'cold_archive', customTag?: string) => Promise<BackupRecord | null>
  restoreBackup: (id: string) => Promise<boolean>
  deleteBackup: (id: string) => Promise<boolean>

  // File Manager (Phase 2)
  fetchFiles: (dirPath?: string) => Promise<void>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  createDirectory: (dirPath: string) => Promise<boolean>

  // Players & Allowlist (Phase 3)
  fetchAllowlist: () => Promise<void>
  fetchOnlinePlayers: () => Promise<void>
  addPlayerToAllowlist: (player: Omit<Player, 'online' | 'pingMs'>) => Promise<boolean>
  removePlayerFromAllowlist: (xuid: string) => Promise<boolean>
  setPlayerRole: (xuid: string, role: 'visitor' | 'member' | 'operator') => Promise<boolean>
  kickPlayer: (nameOrXuid: string, reason?: string) => Promise<boolean>
  lookupXuid: (gamertag: string) => Promise<{ xuid: string; source: string } | null>

  // Addons & Packs (Phase 3)
  fetchPacks: () => Promise<void>
  togglePack: (idOrUuid: string, type?: 'behavior' | 'resource', enabled?: boolean) => Promise<boolean>
  uploadPack: (file: File) => Promise<{ success: boolean; count?: number; error?: string }>
  deletePack: (uuid: string) => Promise<boolean>

  toggleTunnel: () => void
}

let socket: WebSocket | null = null

const INITIAL_CONFIG: BedrockConfig = {
  serverName: 'Bedrock Dedicated Server',
  gamemode: 'survival',
  difficulty: 'easy',
  allowCheats: false,
  maxPlayers: 10,
  onlineMode: true,
  whitelist: false,
  serverPort: 19132,
  serverPortV6: 19133,
  viewDistance: 32,
  tickDistance: 4,
  playerIdleTimeout: 30,
  maxThreads: 8,
  levelName: 'Bedrock level',
  levelSeed: '',
  defaultPlayerPermissionLevel: 'member',
  texturepackRequired: false,
  contentLogFileEnabled: false,
}

const INITIAL_SCHEDULE: BackupSchedule = {
  enabled: false,
  frequency: 'daily',
  intervalHours: 6,
  timeOfDay: '04:00',
  daysOfWeek: [0],
  dayOfMonth: 1,
  cronExpression: '0 4 * * *',
  maxRetainedBackups: 10,
}

function propertiesToConfig(props: Record<string, any>): Partial<BedrockConfig> {
  const result: Partial<BedrockConfig> = {}
  if (props['server-name'] !== undefined) result.serverName = String(props['server-name'])
  if (props['gamemode'] !== undefined) result.gamemode = props['gamemode'] as any
  if (props['difficulty'] !== undefined) result.difficulty = props['difficulty'] as any
  if (props['allow-cheats'] !== undefined) result.allowCheats = Boolean(props['allow-cheats'])
  if (props['max-players'] !== undefined) result.maxPlayers = Number(props['max-players'])
  if (props['online-mode'] !== undefined) result.onlineMode = Boolean(props['online-mode'])
  if (props['allow-list'] !== undefined) result.whitelist = Boolean(props['allow-list'])
  else if (props['white-list'] !== undefined) result.whitelist = Boolean(props['white-list'])
  if (props['server-port'] !== undefined) result.serverPort = Number(props['server-port'])
  if (props['server-portv6'] !== undefined) result.serverPortV6 = Number(props['server-portv6'])
  if (props['view-distance'] !== undefined) result.viewDistance = Number(props['view-distance'])
  if (props['tick-distance'] !== undefined) result.tickDistance = Number(props['tick-distance'])
  if (props['player-idle-timeout'] !== undefined) result.playerIdleTimeout = Number(props['player-idle-timeout'])
  if (props['max-threads'] !== undefined) result.maxThreads = Number(props['max-threads'])
  if (props['level-name'] !== undefined) result.levelName = String(props['level-name'])
  if (props['level-seed'] !== undefined) result.levelSeed = String(props['level-seed'])
  if (props['default-player-permission-level'] !== undefined) result.defaultPlayerPermissionLevel = props['default-player-permission-level'] as any
  if (props['texturepack-required'] !== undefined) result.texturepackRequired = Boolean(props['texturepack-required'])
  if (props['content-log-file-enabled'] !== undefined) result.contentLogFileEnabled = Boolean(props['content-log-file-enabled'])
  return result
}

function configToProperties(cfg: BedrockConfig): Record<string, any> {
  return {
    'server-name': cfg.serverName,
    'gamemode': cfg.gamemode,
    'difficulty': cfg.difficulty,
    'allow-cheats': cfg.allowCheats,
    'max-players': cfg.maxPlayers,
    'online-mode': cfg.onlineMode,
    'allow-list': cfg.whitelist,
    'server-port': cfg.serverPort,
    'server-portv6': cfg.serverPortV6,
    'view-distance': cfg.viewDistance,
    'tick-distance': cfg.tickDistance,
    'player-idle-timeout': cfg.playerIdleTimeout,
    'max-threads': cfg.maxThreads,
    'level-name': cfg.levelName,
    'level-seed': cfg.levelSeed,
    'default-player-permission-level': cfg.defaultPlayerPermissionLevel,
    'texturepack-required': cfg.texturepackRequired,
    'content-log-file-enabled': cfg.contentLogFileEnabled,
  }
}

export const useServerStore = create<ServerStore>((set, get) => ({
  serverState: 'offline',
  wsConnected: false,
  metrics: {
    cpuPercent: 0,
    ramUsedMB: 0,
    ramTotalMB: 2048,
    uptimeSeconds: 0,
    tps: 20.0,
    tickDurationMs: 0,
    activePlayers: 0,
    maxPlayers: 10,
    netInKBps: 0,
    netOutKBps: 0,
  },
  config: INITIAL_CONFIG,
  rawConfig: '',
  players: [],
  allowlist: [],
  packs: [],
  backups: [],
  schedule: INITIAL_SCHEDULE,
  files: [],
  currentPath: '/',
  tunnel: {
    active: false,
    service: 'playit.gg',
    assignedAddress: 'mc-bedrock.gl.at.ply.gg',
    assignedPort: 25432,
    targetPort: 19132,
    pingLatencyMs: 0,
    status: 'disconnected',
  },
  activeTab: 'dashboard',
  logs: ['[SYSTEM] Initializing Bedrock Server Manager...'],

  initWs: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const port = window.location.port === '5173' ? '3001' : (window.location.port || '3001')
    const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws/console`

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        set({ wsConnected: true })
        set((state) => ({ logs: [...state.logs, '[SYSTEM] Connected to server daemon WebSocket'] }))
        // Pre-fetch configs, backups, schedule, files, players, and packs
        get().fetchConfig()
        get().fetchBackups()
        get().fetchBackupSchedule()
        get().fetchFiles('/')
        get().fetchAllowlist()
        get().fetchOnlinePlayers()
        get().fetchPacks()
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'init') {
            set({
              serverState: msg.state as ServerState,
              logs: msg.logs && msg.logs.length > 0 ? msg.logs : ['[SUPERVISOR] Console ready.'],
            })
            if (msg.metrics) {
              set((state) => ({ metrics: { ...state.metrics, ...msg.metrics } }))
            }
            if (msg.players) {
              set({ players: msg.players })
            }
          } else if (msg.type === 'log') {
            set((state) => ({ logs: [...state.logs, msg.data] }))
          } else if (msg.type === 'state') {
            set({ serverState: msg.data as ServerState })
            if (msg.metrics) {
              set((state) => ({ metrics: { ...state.metrics, ...msg.metrics } }))
            }
          } else if (msg.type === 'player_connected') {
            const newPlayer = msg.data
            set((state) => {
              const remaining = state.players.filter((p) => p.xuid !== newPlayer.xuid)
              return {
                players: [...remaining, { ...newPlayer, online: true, role: newPlayer.role || 'member', pingMs: 12 }],
                logs: [...state.logs, `[SUPERVISOR] Player joined: ${newPlayer.name} (XUID: ${newPlayer.xuid})`],
                metrics: msg.metrics ? { ...state.metrics, ...msg.metrics } : state.metrics,
              }
            })
          } else if (msg.type === 'player_disconnected') {
            const leftPlayer = msg.data
            set((state) => ({
              players: state.players.filter((p) => p.xuid !== leftPlayer.xuid),
              logs: [...state.logs, `[SUPERVISOR] Player left: ${leftPlayer.name}`],
              metrics: msg.metrics ? { ...state.metrics, ...msg.metrics } : state.metrics,
            }))
          }
        } catch {
          set((state) => ({ logs: [...state.logs, event.data] }))
        }
      }

      socket.onclose = () => {
        set({ wsConnected: false })
        setTimeout(() => get().initWs(), 3000)
      }

      socket.onerror = () => {
        set({ wsConnected: false })
      }
    } catch {
      setTimeout(() => get().initWs(), 3000)
    }
  },

  fetchStatus: async () => {
    try {
      const res = await fetch('/api/server/status')
      if (res.ok) {
        const data = await res.json()
        set({ serverState: data.state as ServerState })
        if (data.metrics) {
          set((state) => ({ metrics: { ...state.metrics, ...data.metrics } }))
        }
      }
    } catch {
      // Backend might be offline
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  startServer: async () => {
    set({ serverState: 'starting' })
    try {
      const res = await fetch('/api/server/start', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        set((state) => ({ logs: [...state.logs, `[ERROR] Failed to start server: ${data.error}`] }))
        set({ serverState: 'offline' })
      }
    } catch (err: any) {
      set((state) => ({ logs: [...state.logs, `[ERROR] Server start request failed: ${err.message}`] }))
      set({ serverState: 'offline' })
    }
  },

  stopServer: async () => {
    set({ serverState: 'stopping' })
    try {
      const res = await fetch('/api/server/stop', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        set((state) => ({ logs: [...state.logs, `[ERROR] Failed to stop server: ${data.error}`] }))
      }
    } catch (err: any) {
      set((state) => ({ logs: [...state.logs, `[ERROR] Server stop request failed: ${err.message}`] }))
    }
  },

  restartServer: async () => {
    set({ serverState: 'stopping' })
    try {
      await fetch('/api/server/restart', { method: 'POST' })
    } catch (err: any) {
      set((state) => ({ logs: [...state.logs, `[ERROR] Server restart request failed: ${err.message}`] }))
    }
  },

  killServer: async () => {
    try {
      await fetch('/api/server/kill', { method: 'POST' })
      set({ serverState: 'offline' })
    } catch (err: any) {
      set((state) => ({ logs: [...state.logs, `[ERROR] Kill request failed: ${err.message}`] }))
    }
  },

  sendCommand: (cmd: string) => {
    if (!cmd.trim()) return

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'command', command: cmd }))
    } else {
      set((state) => ({ logs: [...state.logs, `> ${cmd}`, '[WARN] Daemon WebSocket not connected'] }))
    }
  },

  // -------------------------------------------------------------
  // CONFIGURATION ACTIONS
  // -------------------------------------------------------------
  fetchConfig: async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          const mapped = propertiesToConfig(data.config)
          set((state) => ({ config: { ...state.config, ...mapped } }))
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch config:', err)
    }
  },

  fetchRawConfig: async () => {
    try {
      const res = await fetch('/api/config/raw')
      if (res.ok) {
        const text = await res.text()
        set({ rawConfig: text })
        return text
      }
    } catch (err: any) {
      console.error('Failed to fetch raw config:', err)
    }
    return ''
  },

  updateConfig: (key, value) => {
    set((state) => ({
      config: { ...state.config, [key]: value },
    }))
  },

  saveConfig: async () => {
    try {
      const props = configToProperties(get().config)
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, '[INFO] [Config] server.properties updated successfully.'],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Config] Failed to save config: ${err.message}`],
      }))
    }
    return false
  },

  saveRawConfig: async (content: string) => {
    try {
      const res = await fetch('/api/config/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      })
      const data = await res.json()
      if (data.success) {
        set({ rawConfig: content })
        if (data.config) {
          const mapped = propertiesToConfig(data.config)
          set((state) => ({ config: { ...state.config, ...mapped } }))
        }
        set((state) => ({
          logs: [...state.logs, '[INFO] [Config] Raw server.properties saved successfully.'],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Config] Failed to save raw config: ${err.message}`],
      }))
    }
    return false
  },

  // -------------------------------------------------------------
  // BACKUP ACTIONS & SCHEDULING
  // -------------------------------------------------------------
  fetchBackups: async () => {
    try {
      const res = await fetch('/api/backups')
      if (res.ok) {
        const data = await res.json()
        if (data.backups) {
          set({ backups: data.backups })
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch backups:', err)
    }
  },

  fetchBackupSchedule: async () => {
    try {
      const res = await fetch('/api/backups/schedule')
      if (res.ok) {
        const data = await res.json()
        if (data.schedule) {
          set({ schedule: data.schedule })
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch backup schedule:', err)
    }
  },

  saveBackupSchedule: async (updates: Partial<BackupSchedule>) => {
    try {
      const current = get().schedule
      const payload = { ...current, ...updates }
      const res = await fetch('/api/backups/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success && data.schedule) {
        set({ schedule: data.schedule })
        set((state) => ({
          logs: [
            ...state.logs,
            `[INFO] [Scheduler] Backup schedule updated (${data.schedule.enabled ? 'Enabled' : 'Disabled'}, ${data.schedule.frequency})`,
          ],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Scheduler] Failed to update schedule: ${err.message}`],
      }))
    }
    return false
  },

  createBackup: async (type: 'hot_leveldb' | 'cold_archive', customTag?: string) => {
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, customTag }),
      })
      const data = await res.json()
      if (data.success && data.backup) {
        set((state) => ({
          backups: [data.backup, ...state.backups.filter((b) => b.id !== data.backup.id)],
          logs: [...state.logs, `[INFO] [Backup] Created ${type} snapshot: ${data.backup.filename}`],
        }))
        return data.backup
      } else {
        set((state) => ({
          logs: [...state.logs, `[ERROR] [Backup] Backup creation failed: ${data.error}`],
        }))
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Backup] Backup request failed: ${err.message}`],
      }))
    }
    return null
  },

  restoreBackup: async (id: string) => {
    try {
      set((state) => ({
        logs: [...state.logs, `[WARN] [Restore] Restoring snapshot ${id}...`],
      }))
      const res = await fetch(`/api/backups/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Restore] Successfully restored world from snapshot ${id}`],
        }))
        return true
      } else {
        set((state) => ({
          logs: [...state.logs, `[ERROR] [Restore] Restore failed: ${data.error}`],
        }))
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Restore] Restore request failed: ${err.message}`],
      }))
    }
    return false
  },

  deleteBackup: async (id: string) => {
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          backups: state.backups.filter((b) => b.id !== id),
          logs: [...state.logs, `[INFO] [Backup] Deleted snapshot ${id}`],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Backup] Failed to delete backup: ${err.message}`],
      }))
    }
    return false
  },

  // -------------------------------------------------------------
  // FILE MANAGER ACTIONS
  // -------------------------------------------------------------
  fetchFiles: async (dirPath: string = '/') => {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.files) {
          set({ files: data.files, currentPath: dirPath })
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch files:', err)
    }
  },

  readFile: async (filePath: string) => {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          return data.content
        }
      }
    } catch (err: any) {
      console.error('Failed to read file:', err)
    }
    return ''
  },

  writeFile: async (filePath: string, content: string) => {
    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Files] File saved: ${filePath}`],
        }))
        // Refresh directory listing
        get().fetchFiles(get().currentPath)
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Files] Failed to save file: ${err.message}`],
      }))
    }
    return false
  },

  deleteFile: async (filePath: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Files] Deleted: ${filePath}`],
        }))
        get().fetchFiles(get().currentPath)
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Files] Failed to delete file: ${err.message}`],
      }))
    }
    return false
  },

  createDirectory: async (dirPath: string) => {
    try {
      const res = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Files] Created directory: ${dirPath}`],
        }))
        get().fetchFiles(get().currentPath)
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Files] Failed to create directory: ${err.message}`],
      }))
    }
    return false
  },

  // -------------------------------------------------------------
  // PLAYERS & ALLOWLIST (Phase 3)
  // -------------------------------------------------------------
  fetchAllowlist: async () => {
    try {
      const res = await fetch('/api/players/allowlist')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        set({ allowlist: data.data })
      }
    } catch (err: any) {
      console.error('[Store] Failed to fetch allowlist:', err)
    }
  },

  fetchOnlinePlayers: async () => {
    try {
      const res = await fetch('/api/players/online')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        set({ players: data.data })
      }
    } catch (err: any) {
      console.error('[Store] Failed to fetch online players:', err)
    }
  },

  addPlayerToAllowlist: async (player) => {
    try {
      const res = await fetch('/api/players/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(player),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Allowlist] Added player ${player.name} (${player.xuid})`],
        }))
        await get().fetchAllowlist()
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Allowlist] Failed to add player: ${err.message}`],
      }))
    }
    return false
  },

  removePlayerFromAllowlist: async (xuid: string) => {
    try {
      const res = await fetch(`/api/players/allowlist/${xuid}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Allowlist] Removed player with XUID ${xuid}`],
        }))
        await get().fetchAllowlist()
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Allowlist] Failed to remove player: ${err.message}`],
      }))
    }
    return false
  },

  setPlayerRole: async (xuid: string, role: 'visitor' | 'member' | 'operator') => {
    try {
      const res = await fetch('/api/players/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xuid, role }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          logs: [...state.logs, `[INFO] [Permissions] Changed role for ${xuid} to ${role}`],
        }))
        await get().fetchAllowlist()
        await get().fetchOnlinePlayers()
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Permissions] Failed to set role: ${err.message}`],
      }))
    }
    return false
  },

  kickPlayer: async (nameOrXuid: string, reason?: string) => {
    try {
      const p = get().players.find((item) => item.xuid === nameOrXuid || item.name.toLowerCase() === nameOrXuid.toLowerCase())
      const name = p ? p.name : nameOrXuid
      const res = await fetch('/api/players/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reason }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          players: state.players.filter((item) => item.xuid !== nameOrXuid && item.name.toLowerCase() !== nameOrXuid.toLowerCase()),
          logs: [...state.logs, `[INFO] [Players] Kicked ${name}`],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Players] Failed to kick player: ${err.message}`],
      }))
    }
    return false
  },

  lookupXuid: async (gamertag: string) => {
    try {
      const res = await fetch(`/api/players/lookup?gamertag=${encodeURIComponent(gamertag)}`)
      const data = await res.json()
      if (data.success && data.xuid) {
        return { xuid: data.xuid, source: data.source }
      }
    } catch {
      // ignore
    }
    return null
  },

  // -------------------------------------------------------------
  // ADDONS & PACKS (Phase 3)
  // -------------------------------------------------------------
  fetchPacks: async () => {
    try {
      const res = await fetch('/api/addons')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        set({ packs: data.data })
      }
    } catch (err: any) {
      console.error('[Store] Failed to fetch addons:', err)
    }
  },

  togglePack: async (idOrUuid: string, type?: 'behavior' | 'resource', enabled?: boolean) => {
    const pack = get().packs.find((p) => p.id === idOrUuid || p.uuid === idOrUuid)
    if (!pack) return false

    const targetType = type || pack.type
    const targetEnabled = enabled !== undefined ? enabled : !pack.enabled

    try {
      const res = await fetch('/api/addons/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: pack.uuid,
          type: targetType,
          enabled: targetEnabled,
        }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          packs: state.packs.map((p) => (p.uuid === pack.uuid ? { ...p, enabled: targetEnabled } : p)),
          logs: [...state.logs, `[INFO] [Addons] ${pack.name} (${targetType.toUpperCase()}) set to ${targetEnabled ? 'ACTIVE' : 'DISABLED'}`],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Addons] Failed to toggle pack: ${err.message}`],
      }))
    }
    return false
  },

  uploadPack: async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/addons/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        await get().fetchPacks()
        set((state) => ({
          logs: [...state.logs, `[INFO] [Addons] Successfully extracted and installed ${data.count || 1} pack(s) from ${file.name}`],
        }))
        return { success: true, count: data.count }
      } else {
        return { success: false, error: data.error || 'Upload failed' }
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  deletePack: async (uuid: string) => {
    try {
      const res = await fetch(`/api/addons/${uuid}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        await get().fetchPacks()
        set((state) => ({
          logs: [...state.logs, `[INFO] [Addons] Deleted pack ${uuid}`],
        }))
        return true
      }
    } catch (err: any) {
      set((state) => ({
        logs: [...state.logs, `[ERROR] [Addons] Failed to delete pack: ${err.message}`],
      }))
    }
    return false
  },

  toggleTunnel: () => {
    set((state) => ({
      tunnel: {
        ...state.tunnel,
        active: !state.tunnel.active,
        status: !state.tunnel.active ? 'connected' : 'disconnected',
      },
    }))
  },
}))
