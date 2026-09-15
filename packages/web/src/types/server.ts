export type ServerState = 'online' | 'offline' | 'starting' | 'stopping' | 'updating'

export interface ServerMetrics {
  cpuPercent: number
  ramUsedMB: number
  ramTotalMB: number
  uptimeSeconds: number
  tps: number
  tickDurationMs: number
  activePlayers: number
  maxPlayers: number
  netInKBps: number
  netOutKBps: number
}

export interface BedrockConfig {
  serverName: string
  gamemode: 'survival' | 'creative' | 'adventure'
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard'
  allowCheats: boolean
  maxPlayers: number
  onlineMode: boolean
  whitelist: boolean
  serverPort: number
  serverPortV6: number
  viewDistance: number
  tickDistance: number
  playerIdleTimeout: number
  maxThreads: number
  levelName: string
  levelSeed: string
  defaultPlayerPermissionLevel: 'visitor' | 'member' | 'operator'
  texturepackRequired: boolean
  contentLogFileEnabled: boolean
}

export interface Player {
  name: string
  xuid: string
  pingMs: number
  role: 'visitor' | 'member' | 'operator'
  online: boolean
  joinedAt?: string
  ignoresPlayerLimit?: boolean
}

export interface AddonPack {
  id: string
  uuid: string
  name: string
  version: string
  type: 'behavior' | 'resource'
  description: string
  author: string
  sizeBytes: number
  enabled: boolean
  isSystem?: boolean
  iconUrl?: string
}

export interface BackupRecord {
  id: string
  filename: string
  sizeBytes: number
  createdAt: string
  type: 'hot_leveldb' | 'cold_archive'
  worldName: string
  tag?: string
}

export type ScheduleFrequency = 'interval' | 'daily' | 'weekly' | 'monthly' | 'cron'

export interface BackupSchedule {
  enabled: boolean
  frequency: ScheduleFrequency
  intervalHours: number
  timeOfDay: string
  daysOfWeek: number[]
  dayOfMonth: number
  cronExpression?: string
  maxRetainedBackups: number
  lastRunAt?: string
  nextRunAt?: string
}

export interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  sizeBytes: number
  modifiedAt: string
  extension?: string
}

export interface TunnelStatus {
  active: boolean
  service: 'playit.gg' | 'custom_udp'
  assignedAddress: string
  assignedPort: number
  targetPort: number
  pingLatencyMs: number
  status: 'connected' | 'connecting' | 'disconnected'
}
