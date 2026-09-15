import fs from 'node:fs'
import path from 'node:path'

export interface ParsedConfig {
  [key: string]: string | number | boolean
}

export class ConfigService {
  private bdsDir: string

  constructor(bdsDir: string) {
    this.bdsDir = bdsDir
  }

  getPropertiesPath(): string {
    return path.join(this.bdsDir, 'server.properties')
  }

  getRaw(): string {
    const p = this.getPropertiesPath()
    if (!fs.existsSync(p)) return ''
    return fs.readFileSync(p, 'utf-8')
  }

  saveRaw(content: string): void {
    const p = this.getPropertiesPath()
    fs.writeFileSync(p, content, 'utf-8')
  }

  parse(): ParsedConfig {
    const raw = this.getRaw()
    const result: ParsedConfig = {}

    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue

      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()

      if (val.toLowerCase() === 'true') {
        result[key] = true
      } else if (val.toLowerCase() === 'false') {
        result[key] = false
      } else if (/^-?\d+$/.test(val)) {
        result[key] = parseInt(val, 10)
      } else {
        result[key] = val
      }
    }

    return result
  }

  update(updates: ParsedConfig): ParsedConfig {
    const raw = this.getRaw()
    const lines = raw.split(/\r?\n/)
    const handledKeys = new Set<string>()

    const newLines = lines.map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return line

      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) return line

      const key = trimmed.slice(0, eqIdx).trim()
      if (key in updates) {
        handledKeys.add(key)
        return `${key}=${updates[key]}`
      }
      return line
    })

    // Append any new keys that weren't in the original file
    for (const [k, v] of Object.entries(updates)) {
      if (!handledKeys.has(k)) {
        newLines.push(`${k}=${v}`)
      }
    }

    this.saveRaw(newLines.join('\r\n'))
    return this.parse()
  }
}
