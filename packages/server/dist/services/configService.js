import fs from 'node:fs';
import path from 'node:path';
export class ConfigService {
    bdsDir;
    constructor(bdsDir) {
        this.bdsDir = bdsDir;
    }
    getPropertiesPath() {
        return path.join(this.bdsDir, 'server.properties');
    }
    getRaw() {
        const p = this.getPropertiesPath();
        if (!fs.existsSync(p))
            return '';
        return fs.readFileSync(p, 'utf-8');
    }
    saveRaw(content) {
        const p = this.getPropertiesPath();
        fs.writeFileSync(p, content, 'utf-8');
    }
    parse() {
        const raw = this.getRaw();
        const result = {};
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1)
                continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (val.toLowerCase() === 'true') {
                result[key] = true;
            }
            else if (val.toLowerCase() === 'false') {
                result[key] = false;
            }
            else if (/^-?\d+$/.test(val)) {
                result[key] = parseInt(val, 10);
            }
            else {
                result[key] = val;
            }
        }
        return result;
    }
    update(updates) {
        const raw = this.getRaw();
        const lines = raw.split(/\r?\n/);
        const handledKeys = new Set();
        const newLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                return line;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1)
                return line;
            const key = trimmed.slice(0, eqIdx).trim();
            if (key in updates) {
                handledKeys.add(key);
                return `${key}=${updates[key]}`;
            }
            return line;
        });
        // Append any new keys that weren't in the original file
        for (const [k, v] of Object.entries(updates)) {
            if (!handledKeys.has(k)) {
                newLines.push(`${k}=${v}`);
            }
        }
        this.saveRaw(newLines.join('\r\n'));
        return this.parse();
    }
}
