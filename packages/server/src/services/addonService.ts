import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { ConfigService } from './configService.js'

const execAsync = promisify(exec)

export interface AddonManifest {
  format_version: number
  header: {
    name: string
    description?: string
    uuid: string
    version: number[]
    min_engine_version?: number[]
  }
  modules?: Array<{
    type: string
    uuid: string
    version: number[]
    description?: string
  }>
  dependencies?: Array<{
    uuid: string
    version: number[]
  }>
}

export interface AddonPackInfo {
  id: string
  uuid: string
  name: string
  version: string
  versionArray: number[]
  type: 'behavior' | 'resource'
  description: string
  author: string
  sizeBytes: number
  enabled: boolean
  isSystem: boolean
  folderName: string
}

export class AddonService {
  private bdsDir: string
  private behaviorDir: string
  private resourceDir: string
  private configService: ConfigService

  constructor(bdsDir: string, configService: ConfigService) {
    this.bdsDir = bdsDir
    this.configService = configService
    this.behaviorDir = path.join(bdsDir, 'behavior_packs')
    this.resourceDir = path.join(bdsDir, 'resource_packs')
    this.ensureDirs()
  }

  private ensureDirs() {
    if (!fs.existsSync(this.behaviorDir)) {
      fs.mkdirSync(this.behaviorDir, { recursive: true })
    }
    if (!fs.existsSync(this.resourceDir)) {
      fs.mkdirSync(this.resourceDir, { recursive: true })
    }
  }

  private getActiveWorldDir(): string {
    const cfg = this.configService.parse()
    const worldName = (cfg['level-name'] as string) || 'Bedrock level'
    const worldDir = path.join(this.bdsDir, 'worlds', worldName)
    if (!fs.existsSync(worldDir)) {
      fs.mkdirSync(worldDir, { recursive: true })
    }
    return worldDir
  }

  private getActiveWorldPacks(type: 'behavior' | 'resource'): Array<{ pack_id: string; version: number[] }> {
    const worldDir = this.getActiveWorldDir()
    const filename = type === 'behavior' ? 'world_behavior_packs.json' : 'world_resource_packs.json'
    const filePath = path.join(worldDir, filename)

    if (!fs.existsSync(filePath)) {
      return []
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private setActiveWorldPacks(type: 'behavior' | 'resource', packs: Array<{ pack_id: string; version: number[] }>) {
    const worldDir = this.getActiveWorldDir()
    const filename = type === 'behavior' ? 'world_behavior_packs.json' : 'world_resource_packs.json'
    const filePath = path.join(worldDir, filename)
    fs.writeFileSync(filePath, JSON.stringify(packs, null, 2), 'utf-8')
  }

  private getFolderSize(dirPath: string): number {
    let total = 0
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          total += this.getFolderSize(full)
        } else if (entry.isFile()) {
          total += fs.statSync(full).size
        }
      }
    } catch {
      // ignore
    }
    return total
  }

  private parseManifest(manifestPath: string): AddonManifest | null {
    try {
      if (!fs.existsSync(manifestPath)) return null
      const content = fs.readFileSync(manifestPath, 'utf-8')
      return JSON.parse(content) as AddonManifest
    } catch {
      return null
    }
  }

  private isSystemPackName(folderName: string): boolean {
    return /^(vanilla|chemistry|editor|experimental|server_)/i.test(folderName)
  }

  getPacks(): AddonPackInfo[] {
    this.ensureDirs()
    const results: AddonPackInfo[] = []

    const activeBPs = new Map(this.getActiveWorldPacks('behavior').map((p) => [p.pack_id, p]))
    const activeRPs = new Map(this.getActiveWorldPacks('resource').map((p) => [p.pack_id, p]))

    // Scan Behavior Packs
    if (fs.existsSync(this.behaviorDir)) {
      const folders = fs.readdirSync(this.behaviorDir)
      for (const folder of folders) {
        const packPath = path.join(this.behaviorDir, folder)
        if (!fs.statSync(packPath).isDirectory()) continue

        const manifestPath = path.join(packPath, 'manifest.json')
        const manifest = this.parseManifest(manifestPath)
        if (!manifest || !manifest.header) continue

        const uuid = manifest.header.uuid
        const versionArr = Array.isArray(manifest.header.version) ? manifest.header.version : [1, 0, 0]
        const versionStr = versionArr.join('.')
        const size = this.getFolderSize(packPath)
        const isSys = this.isSystemPackName(folder)

        results.push({
          id: `bp-${uuid || folder}`,
          uuid,
          name: manifest.header.name || folder,
          version: versionStr,
          versionArray: versionArr,
          type: 'behavior',
          description: manifest.header.description || 'No description provided.',
          author: isSys ? 'Mojang' : 'Custom Pack',
          sizeBytes: size,
          enabled: activeBPs.has(uuid),
          isSystem: isSys,
          folderName: folder,
        })
      }
    }

    // Scan Resource Packs
    if (fs.existsSync(this.resourceDir)) {
      const folders = fs.readdirSync(this.resourceDir)
      for (const folder of folders) {
        const packPath = path.join(this.resourceDir, folder)
        if (!fs.statSync(packPath).isDirectory()) continue

        const manifestPath = path.join(packPath, 'manifest.json')
        const manifest = this.parseManifest(manifestPath)
        if (!manifest || !manifest.header) continue

        const uuid = manifest.header.uuid
        const versionArr = Array.isArray(manifest.header.version) ? manifest.header.version : [1, 0, 0]
        const versionStr = versionArr.join('.')
        const size = this.getFolderSize(packPath)
        const isSys = this.isSystemPackName(folder)

        results.push({
          id: `rp-${uuid || folder}`,
          uuid,
          name: manifest.header.name || folder,
          version: versionStr,
          versionArray: versionArr,
          type: 'resource',
          description: manifest.header.description || 'No description provided.',
          author: isSys ? 'Mojang' : 'Custom Pack',
          sizeBytes: size,
          enabled: activeRPs.has(uuid),
          isSystem: isSys,
          folderName: folder,
        })
      }
    }

    // Custom packs first, then alphabetically
    return results.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }

  togglePack(uuid: string, type: 'behavior' | 'resource', enabled: boolean): boolean {
    const packs = this.getPacks()
    const targetPack = packs.find((p) => p.uuid === uuid && p.type === type)
    if (!targetPack) {
      throw new Error(`Pack with UUID ${uuid} and type ${type} not found`)
    }

    const currentActive = this.getActiveWorldPacks(type)
    let updated = currentActive.filter((p) => p.pack_id !== uuid)

    if (enabled) {
      updated.push({
        pack_id: uuid,
        version: targetPack.versionArray,
      })
    }

    this.setActiveWorldPacks(type, updated)
    return true
  }

  deletePack(uuid: string): boolean {
    const packs = this.getPacks()
    const targetPack = packs.find((p) => p.uuid === uuid)
    if (!targetPack) {
      throw new Error(`Pack with UUID ${uuid} not found`)
    }

    if (targetPack.isSystem) {
      throw new Error('Cannot delete built-in Mojang system packs')
    }

    // Unlink from active world configs first
    const activeBPs = this.getActiveWorldPacks('behavior').filter((p) => p.pack_id !== uuid)
    this.setActiveWorldPacks('behavior', activeBPs)

    const activeRPs = this.getActiveWorldPacks('resource').filter((p) => p.pack_id !== uuid)
    this.setActiveWorldPacks('resource', activeRPs)

    // Remove folder
    const targetDir = targetPack.type === 'behavior' ? this.behaviorDir : this.resourceDir
    const folderPath = path.join(targetDir, targetPack.folderName)

    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true })
      return true
    }

    return false
  }

  /**
   * Installs an uploaded .mcpack, .mcaddon, or .zip buffer
   */
  async installPackFromBuffer(fileName: string, buffer: Buffer): Promise<AddonPackInfo[]> {
    this.ensureDirs()
    const tempBaseDir = path.join(this.bdsDir, 'temp_uploads')
    if (!fs.existsSync(tempBaseDir)) {
      fs.mkdirSync(tempBaseDir, { recursive: true })
    }

    const stamp = Date.now()
    const tempZipFile = path.join(tempBaseDir, `upload_${stamp}.zip`)
    const tempExtractDir = path.join(tempBaseDir, `extract_${stamp}`)

    fs.writeFileSync(tempZipFile, buffer)
    fs.mkdirSync(tempExtractDir, { recursive: true })

    const isWindows = process.platform === 'win32'

    try {
      if (isWindows) {
        await execAsync(`powershell -Command "Expand-Archive -Path '${tempZipFile}' -DestinationPath '${tempExtractDir}' -Force"`)
      } else {
        await execAsync(`unzip -o "${tempZipFile}" -d "${tempExtractDir}"`)
      }

      const installedPacks: AddonPackInfo[] = []
      await this.processExtractedDirectory(tempExtractDir, installedPacks)

      return installedPacks
    } finally {
      // Clean up temp files
      try {
        if (fs.existsSync(tempZipFile)) fs.unlinkSync(tempZipFile)
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  }

  private async processExtractedDirectory(extractDir: string, installed: AddonPackInfo[]) {
    // Check if there are .mcpack files inside (e.g. inside an .mcaddon)
    const isWindows = process.platform === 'win32'
    const entries = fs.readdirSync(extractDir, { withFileTypes: true })

    // Check for nested .mcpack files
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.mcpack') || entry.name.endsWith('.zip'))) {
        const subZip = path.join(extractDir, entry.name)
        const subExtract = path.join(extractDir, `sub_${entry.name.replace(/[^a-zA-Z0-9]/g, '_')}`)
        fs.mkdirSync(subExtract, { recursive: true })
        try {
          if (isWindows) {
            let archivePath = subZip
            if (!subZip.endsWith('.zip')) {
              archivePath = `${subZip}.zip`
              fs.copyFileSync(subZip, archivePath)
            }
            await execAsync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${subExtract}' -Force"`)
            if (archivePath !== subZip && fs.existsSync(archivePath)) {
              try { fs.unlinkSync(archivePath) } catch {}
            }
          } else {
            await execAsync(`unzip -o "${subZip}" -d "${subExtract}"`)
          }
          await this.processExtractedDirectory(subExtract, installed)
        } catch {
          // ignore extraction error for non-zip
        }
      }
    }

    // Find all directories with a manifest.json
    const manifestDirs: string[] = []
    const findManifests = (current: string) => {
      const currentManifest = path.join(current, 'manifest.json')
      if (fs.existsSync(currentManifest)) {
        manifestDirs.push(current)
        return // Pack boundary reached
      }

      const subEntries = fs.readdirSync(current, { withFileTypes: true })
      for (const sub of subEntries) {
        if (sub.isDirectory() && !sub.name.startsWith('sub_')) {
          findManifests(path.join(current, sub.name))
        }
      }
    }

    findManifests(extractDir)

    for (const dir of manifestDirs) {
      const manifestPath = path.join(dir, 'manifest.json')
      const manifest = this.parseManifest(manifestPath)
      if (!manifest || !manifest.header) continue

      // Determine behavior vs resource
      let type: 'behavior' | 'resource' = 'behavior'
      const modules = manifest.modules || []
      const isResource = modules.some((m) => m.type === 'resources' || m.type === 'client_data')
      const isBehavior = modules.some((m) => m.type === 'data' || m.type === 'script')

      if (isResource && !isBehavior) {
        type = 'resource'
      } else {
        type = 'behavior'
      }

      // Prepare target folder name
      const safeName = (manifest.header.name || manifest.header.uuid || 'pack')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase()
        .slice(0, 40)
      const folderName = `${safeName}_${manifest.header.uuid.slice(0, 8)}`
      const targetBase = type === 'behavior' ? this.behaviorDir : this.resourceDir
      const destDir = path.join(targetBase, folderName)

      // Copy directory into destination
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true })
      }
      fs.cpSync(dir, destDir, { recursive: true })

      const versionArr = Array.isArray(manifest.header.version) ? manifest.header.version : [1, 0, 0]
      installed.push({
        id: `${type === 'behavior' ? 'bp' : 'rp'}-${manifest.header.uuid}`,
        uuid: manifest.header.uuid,
        name: manifest.header.name || folderName,
        version: versionArr.join('.'),
        versionArray: versionArr,
        type,
        description: manifest.header.description || '',
        author: 'Custom Pack',
        sizeBytes: this.getFolderSize(destDir),
        enabled: false,
        isSystem: false,
        folderName,
      })
    }
  }
}
