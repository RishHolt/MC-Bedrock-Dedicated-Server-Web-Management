import fs from 'node:fs'
import path from 'node:path'
import type { BdsSupervisor } from '../bds/supervisor.js'

export interface AllowlistRawItem {
  name: string
  xuid: string
  ignoresPlayerLimit?: boolean
}

export interface PermissionRawItem {
  permission: 'visitor' | 'member' | 'operator'
  xuid: string
}

export interface UnifiedPlayer {
  name: string
  xuid: string
  role: 'visitor' | 'member' | 'operator'
  ignoresPlayerLimit: boolean
  online: boolean
  pingMs: number
  joinedAt?: string
}

export class PlayerService {
  private bdsDir: string
  private allowlistPath: string
  private permissionsPath: string
  private supervisor: BdsSupervisor
  private xuidCache = new Map<string, string>()

  constructor(bdsDir: string, supervisor: BdsSupervisor) {
    this.bdsDir = bdsDir
    this.supervisor = supervisor
    this.allowlistPath = path.join(bdsDir, 'allowlist.json')
    this.permissionsPath = path.join(bdsDir, 'permissions.json')
    this.ensureFiles()
  }

  private ensureFiles() {
    if (!fs.existsSync(this.allowlistPath)) {
      // Check legacy whitelist.json
      const legacyWhitelist = path.join(this.bdsDir, 'whitelist.json')
      if (fs.existsSync(legacyWhitelist)) {
        try {
          fs.copyFileSync(legacyWhitelist, this.allowlistPath)
        } catch {
          fs.writeFileSync(this.allowlistPath, '[]', 'utf-8')
        }
      } else {
        fs.writeFileSync(this.allowlistPath, '[]', 'utf-8')
      }
    }

    if (!fs.existsSync(this.permissionsPath)) {
      fs.writeFileSync(this.permissionsPath, '[]', 'utf-8')
    }
  }

  private readAllowlistRaw(): AllowlistRawItem[] {
    try {
      this.ensureFiles()
      const content = fs.readFileSync(this.allowlistPath, 'utf-8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private writeAllowlistRaw(data: AllowlistRawItem[]) {
    this.ensureFiles()
    fs.writeFileSync(this.allowlistPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private readPermissionsRaw(): PermissionRawItem[] {
    try {
      this.ensureFiles()
      const content = fs.readFileSync(this.permissionsPath, 'utf-8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private writePermissionsRaw(data: PermissionRawItem[]) {
    this.ensureFiles()
    fs.writeFileSync(this.permissionsPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  getAllowlist(): UnifiedPlayer[] {
    const rawAllowlist = this.readAllowlistRaw()
    const rawPermissions = this.readPermissionsRaw()
    const permMap = new Map<string, 'visitor' | 'member' | 'operator'>()
    for (const p of rawPermissions) {
      permMap.set(p.xuid, p.permission)
    }

    const connectedPlayers = this.supervisor.getConnectedPlayers()
    const connectedMap = new Map(connectedPlayers.map((cp) => [cp.xuid, cp]))

    return rawAllowlist.map((item) => {
      const conn = connectedMap.get(item.xuid)
      return {
        name: item.name,
        xuid: item.xuid,
        role: permMap.get(item.xuid) || 'member',
        ignoresPlayerLimit: Boolean(item.ignoresPlayerLimit),
        online: Boolean(conn),
        pingMs: conn ? 15 : 0,
        joinedAt: conn?.joinedAt,
      }
    })
  }

  getOnlinePlayers(): UnifiedPlayer[] {
    const connected = this.supervisor.getConnectedPlayers()
    const rawPermissions = this.readPermissionsRaw()
    const permMap = new Map<string, 'visitor' | 'member' | 'operator'>()
    for (const p of rawPermissions) {
      permMap.set(p.xuid, p.permission)
    }

    const rawAllowlist = this.readAllowlistRaw()
    const allowMap = new Map(rawAllowlist.map((a) => [a.xuid, a]))

    return connected.map((cp) => ({
      name: cp.name,
      xuid: cp.xuid,
      role: permMap.get(cp.xuid) || 'member',
      ignoresPlayerLimit: Boolean(allowMap.get(cp.xuid)?.ignoresPlayerLimit),
      online: true,
      pingMs: 12,
      joinedAt: cp.joinedAt,
    }))
  }

  async addOrUpdatePlayer(player: {
    name: string
    xuid: string
    role?: 'visitor' | 'member' | 'operator'
    ignoresPlayerLimit?: boolean
  }): Promise<UnifiedPlayer> {
    const allowlist = this.readAllowlistRaw()
    const existingIdx = allowlist.findIndex((p) => p.xuid === player.xuid || p.name.toLowerCase() === player.name.toLowerCase())

    const newItem: AllowlistRawItem = {
      name: player.name,
      xuid: player.xuid,
      ignoresPlayerLimit: player.ignoresPlayerLimit ?? false,
    }

    if (existingIdx !== -1) {
      allowlist[existingIdx] = newItem
    } else {
      allowlist.push(newItem)
    }
    this.writeAllowlistRaw(allowlist)

    // Update permissions
    const role = player.role || 'member'
    const perms = this.readPermissionsRaw()
    const permIdx = perms.findIndex((p) => p.xuid === player.xuid)
    if (permIdx !== -1) {
      perms[permIdx].permission = role
    } else {
      perms.push({ permission: role, xuid: player.xuid })
    }
    this.writePermissionsRaw(perms)

    // Hot reload BDS if online
    if (this.supervisor.getState() === 'online') {
      this.supervisor.sendCommand('allowlist reload')
      this.supervisor.sendCommand('permission reload')
    }

    // Cache XUID
    this.xuidCache.set(player.name.toLowerCase(), player.xuid)

    return {
      name: player.name,
      xuid: player.xuid,
      role,
      ignoresPlayerLimit: Boolean(player.ignoresPlayerLimit),
      online: false,
      pingMs: 0,
    }
  }

  async removePlayer(xuid: string): Promise<boolean> {
    const allowlist = this.readAllowlistRaw()
    const initialLen = allowlist.length
    const filtered = allowlist.filter((p) => p.xuid !== xuid)

    if (filtered.length !== initialLen) {
      this.writeAllowlistRaw(filtered)
      if (this.supervisor.getState() === 'online') {
        this.supervisor.sendCommand('allowlist reload')
      }
      return true
    }
    return false
  }

  async setRole(xuid: string, role: 'visitor' | 'member' | 'operator'): Promise<boolean> {
    const perms = this.readPermissionsRaw()
    const permIdx = perms.findIndex((p) => p.xuid === xuid)

    if (permIdx !== -1) {
      perms[permIdx].permission = role
    } else {
      perms.push({ permission: role, xuid })
    }
    this.writePermissionsRaw(perms)

    if (this.supervisor.getState() === 'online') {
      this.supervisor.sendCommand('permission reload')
    }
    return true
  }

  kickPlayer(nameOrXuid: string, reason = 'Kicked by administrator'): boolean {
    if (this.supervisor.getState() !== 'online') {
      return false
    }

    // Check if name was passed or xuid
    let targetName = nameOrXuid
    const connected = this.supervisor.getConnectedPlayers()
    const match = connected.find((p) => p.xuid === nameOrXuid || p.name.toLowerCase() === nameOrXuid.toLowerCase())
    if (match) {
      targetName = match.name
    }

    this.supervisor.sendCommand(`kick "${targetName}" ${reason}`)
    return true
  }

  async lookupXuid(gamertag: string): Promise<{ xuid: string; source: string }> {
    const cleanTag = gamertag.trim()
    const lower = cleanTag.toLowerCase()

    if (this.xuidCache.has(lower)) {
      return { xuid: this.xuidCache.get(lower)!, source: 'cache' }
    }

    // Check existing allowlist
    const existing = this.readAllowlistRaw().find((p) => p.name.toLowerCase() === lower)
    if (existing && existing.xuid) {
      this.xuidCache.set(lower, existing.xuid)
      return { xuid: existing.xuid, source: 'allowlist' }
    }

    // Try public GeyserMC XUID API
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(cleanTag)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BedrockServerManager/0.1' },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as any
        if (data && data.xuid) {
          const xuidStr = String(data.xuid)
          this.xuidCache.set(lower, xuidStr)
          return { xuid: xuidStr, source: 'xbox_live' }
        }
      }
    } catch {
      // Offline or lookup timeout, fallback to deterministic hash
    }

    // Fallback deterministic 16-digit XUID
    const hash = Math.abs(cleanTag.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))
    const fallbackXuid = `2533${hash.toString().padStart(12, '0').slice(0, 12)}`
    this.xuidCache.set(lower, fallbackXuid)
    return { xuid: fallbackXuid, source: 'offline_generated' }
  }
}
