import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export class BdsInstaller {
  private bdsDir: string

  constructor(customBdsDir?: string) {
    if (customBdsDir) {
      this.bdsDir = customBdsDir
    } else {
      const cwd = process.cwd()
      if (cwd.endsWith('packages\\server') || cwd.endsWith('packages/server')) {
        this.bdsDir = path.resolve(cwd, '../../bds')
      } else {
        this.bdsDir = path.resolve(cwd, 'bds')
      }
    }
  }

  getBdsDirectory(): string {
    return this.bdsDir
  }

  getBinaryPath(): string {
    const isWindows = process.platform === 'win32'
    return path.join(this.bdsDir, isWindows ? 'bedrock_server.exe' : 'bedrock_server')
  }

  isInstalled(): boolean {
    return fs.existsSync(this.getBinaryPath())
  }

  ensureDirectories(): void {
    if (!fs.existsSync(this.bdsDir)) {
      fs.mkdirSync(this.bdsDir, { recursive: true })
    }
    const worldsDir = path.join(this.bdsDir, 'worlds')
    const bpDir = path.join(this.bdsDir, 'behavior_packs')
    const rpDir = path.join(this.bdsDir, 'resource_packs')

    if (!fs.existsSync(worldsDir)) fs.mkdirSync(worldsDir, { recursive: true })
    if (!fs.existsSync(bpDir)) fs.mkdirSync(bpDir, { recursive: true })
    if (!fs.existsSync(rpDir)) fs.mkdirSync(rpDir, { recursive: true })
  }

  /**
   * Generates baseline configuration files if they don't exist yet
   */
  ensureDefaultConfigs(): void {
    this.ensureDirectories()
    const serverPropsPath = path.join(this.bdsDir, 'server.properties')
    const allowlistPath = path.join(this.bdsDir, 'allowlist.json')
    const permissionsPath = path.join(this.bdsDir, 'permissions.json')

    if (!fs.existsSync(serverPropsPath)) {
      const defaultProps = `# Minecraft Bedrock Dedicated Server Properties
# Managed by Bedrock Server Manager
server-name=Bedrock Dedicated Server
gamemode=survival
difficulty=easy
allow-cheats=false
max-players=10
online-mode=true
white-list=false
server-port=19132
server-portv6=19133
view-distance=32
tick-distance=4
player-idle-timeout=30
max-threads=8
level-name=BedrockLevel
level-seed=
default-player-permission-level=member
texturepack-required=false
content-log-file-enabled=true
`
      fs.writeFileSync(serverPropsPath, defaultProps, 'utf-8')
    }

    if (!fs.existsSync(allowlistPath)) {
      fs.writeFileSync(allowlistPath, '[]\n', 'utf-8')
    }

    if (!fs.existsSync(permissionsPath)) {
      fs.writeFileSync(permissionsPath, '[]\n', 'utf-8')
    }
  }

  /**
   * Dynamically query official Mojang API for the latest download URL
   */
  async getLatestDownloadUrl(): Promise<string> {
    const isWindows = process.platform === 'win32'
    const targetType = isWindows ? 'serverBedrockWindows' : 'serverBedrockLinux'

    try {
      const res = await fetch('https://net-secondary.web.minecraft-services.net/api/v1.0/download/links')
      if (res.ok) {
        const json: any = await res.json()
        const match = json?.result?.links?.find((l: any) => l.downloadType === targetType)
        if (match?.downloadUrl) {
          return match.downloadUrl
        }
      }
    } catch {
      // Fallback
    }

    return isWindows
      ? 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.26.45.1.zip'
      : 'https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-1.26.45.1.zip'
  }

  /**
   * Download and extract official BDS binary from Mojang
   */
  async downloadAndInstall(onProgress?: (msg: string) => void): Promise<boolean> {
    this.ensureDirectories()
    this.ensureDefaultConfigs()

    const isWindows = process.platform === 'win32'
    const downloadUrl = await this.getLatestDownloadUrl()
    const zipPath = path.join(this.bdsDir, 'bds_download.zip')

    if (onProgress) onProgress(`Fetching latest Bedrock Dedicated Server (${downloadUrl})...`)

    try {
      const response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`Mojang server responded with status: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(zipPath, buffer)

      if (onProgress) onProgress('Download complete. Extracting binaries...')

      if (isWindows) {
        await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.bdsDir}' -Force"`)
      } else {
        await execAsync(`unzip -o "${zipPath}" -d "${this.bdsDir}"`)
        const bin = this.getBinaryPath()
        if (fs.existsSync(bin)) {
          fs.chmodSync(bin, 0o755)
        }
      }

      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath)
      }

      if (onProgress) onProgress('Bedrock Dedicated Server installed successfully!')
      return true
    } catch (err: any) {
      if (onProgress) onProgress(`Installation error: ${err.message}`)
      throw err
    }
  }
}
