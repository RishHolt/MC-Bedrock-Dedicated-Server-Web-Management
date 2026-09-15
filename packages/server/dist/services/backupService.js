import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
export class BackupService {
    bdsDir;
    backupsDir;
    supervisor;
    configService;
    constructor(bdsDir, supervisor, configService) {
        this.bdsDir = bdsDir;
        this.backupsDir = path.join(bdsDir, 'backups');
        this.supervisor = supervisor;
        this.configService = configService;
        this.ensureDirectory();
    }
    ensureDirectory() {
        if (!fs.existsSync(this.backupsDir)) {
            fs.mkdirSync(this.backupsDir, { recursive: true });
        }
    }
    getBackups() {
        this.ensureDirectory();
        const files = fs.readdirSync(this.backupsDir);
        const result = [];
        for (const f of files) {
            if (!f.endsWith('.zip'))
                continue;
            const fullPath = path.join(this.backupsDir, f);
            const stat = fs.statSync(fullPath);
            const isHot = f.includes('-hot-');
            const baseName = f.replace('.zip', '');
            // Extract custom tag if filename has format: bedrock-type-timestamp_tag
            let tag = undefined;
            const underscoreIdx = baseName.indexOf('_');
            if (underscoreIdx !== -1) {
                tag = baseName.slice(underscoreIdx + 1);
            }
            result.push({
                id: baseName,
                filename: f,
                sizeBytes: stat.size,
                createdAt: stat.mtime.toLocaleString(),
                type: isHot ? 'hot_leveldb' : 'cold_archive',
                worldName: 'Bedrock level',
                tag,
            });
        }
        // Sort newest first
        return result.sort((a, b) => b.id.localeCompare(a.id));
    }
    getBackupPath(filename) {
        const sanitized = path.basename(filename);
        const target = path.join(this.backupsDir, sanitized.endsWith('.zip') ? sanitized : `${sanitized}.zip`);
        if (!fs.existsSync(target)) {
            throw new Error(`Backup file not found: ${sanitized}`);
        }
        return target;
    }
    deleteBackup(filename) {
        const target = this.getBackupPath(filename);
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            return true;
        }
        return false;
    }
    async createBackup(type = 'hot_leveldb', customTag) {
        this.ensureDirectory();
        const cfg = this.configService.parse();
        const worldName = cfg['level-name'] || 'Bedrock level';
        const worldPath = path.join(this.bdsDir, 'worlds', worldName);
        if (!fs.existsSync(worldPath)) {
            throw new Error(`World directory not found at: ${worldPath}`);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        let cleanTag = customTag ? customTag.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) : undefined;
        if (cleanTag && cleanTag.length === 0)
            cleanTag = undefined;
        const backupId = cleanTag
            ? `bedrock-${type === 'hot_leveldb' ? 'hot' : 'cold'}-${timestamp}_${cleanTag}`
            : `bedrock-${type === 'hot_leveldb' ? 'hot' : 'cold'}-${timestamp}`;
        const zipFilename = `${backupId}.zip`;
        const destZipPath = path.join(this.backupsDir, zipFilename);
        const isWindows = process.platform === 'win32';
        // If server is online and hot backup is requested, execute the Mojang save hold protocol
        if (this.supervisor.getState() === 'online' && type === 'hot_leveldb') {
            this.supervisor.sendCommand('save hold');
            // Small pause to allow BDS to flush LevelDB memory to snapshot state
            await new Promise((r) => setTimeout(r, 1200));
            this.supervisor.sendCommand('save query');
            await new Promise((r) => setTimeout(r, 800));
        }
        try {
            // Archive world folder
            if (isWindows) {
                // PowerShell Compress-Archive
                await execAsync(`powershell -Command "Compress-Archive -Path '${worldPath}' -DestinationPath '${destZipPath}' -Force"`);
            }
            else {
                await execAsync(`zip -r "${destZipPath}" "${worldPath}"`);
            }
        }
        finally {
            // Always resume writes if server was held
            if (this.supervisor.getState() === 'online' && type === 'hot_leveldb') {
                this.supervisor.sendCommand('save resume');
            }
        }
        const stat = fs.statSync(destZipPath);
        return {
            id: backupId,
            filename: zipFilename,
            sizeBytes: stat.size,
            createdAt: new Date().toLocaleString(),
            type,
            worldName,
            tag: cleanTag,
        };
    }
    pruneOldBackups(maxRetained) {
        if (!maxRetained || maxRetained <= 0)
            return 0;
        const backups = this.getBackups();
        if (backups.length <= maxRetained)
            return 0;
        const toDelete = backups.slice(maxRetained);
        let deletedCount = 0;
        for (const b of toDelete) {
            try {
                if (this.deleteBackup(b.id)) {
                    deletedCount++;
                }
            }
            catch { }
        }
        return deletedCount;
    }
    async restoreBackup(filename) {
        const zipPath = this.getBackupPath(filename);
        const cfg = this.configService.parse();
        const worldName = cfg['level-name'] || 'Bedrock level';
        const worldsDir = path.join(this.bdsDir, 'worlds');
        const targetWorldPath = path.join(worldsDir, worldName);
        const isWindows = process.platform === 'win32';
        // If server is running, stop it first to unlock LevelDB files
        const wasRunning = this.supervisor.getState() === 'online';
        if (wasRunning) {
            await this.supervisor.stop();
            await new Promise((r) => setTimeout(r, 2000));
        }
        try {
            // Clean target world directory
            if (fs.existsSync(targetWorldPath)) {
                fs.rmSync(targetWorldPath, { recursive: true, force: true });
            }
            // Extract backup archive
            if (isWindows) {
                await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${worldsDir}' -Force"`);
            }
            else {
                await execAsync(`unzip -o "${zipPath}" -d "${worldsDir}"`);
            }
            // If server was running previously, start it back up
            if (wasRunning) {
                await this.supervisor.start();
            }
            return true;
        }
        catch (err) {
            throw err;
        }
    }
}
