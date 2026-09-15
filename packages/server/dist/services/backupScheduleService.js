import fs from 'node:fs';
import path from 'node:path';
const DEFAULT_SCHEDULE = {
    enabled: false,
    frequency: 'daily',
    intervalHours: 6,
    timeOfDay: '04:00',
    daysOfWeek: [0], // Sunday
    dayOfMonth: 1,
    cronExpression: '0 4 * * *',
    maxRetainedBackups: 10,
};
export class BackupScheduleService {
    bdsDir;
    configPath;
    config;
    backupService;
    supervisor;
    timer = null;
    isRunning = false;
    constructor(bdsDir, backupService, supervisor) {
        this.bdsDir = bdsDir;
        this.configPath = path.join(bdsDir, 'backup-schedule.json');
        this.backupService = backupService;
        this.supervisor = supervisor;
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                return { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) };
            }
        }
        catch (err) {
            console.error('[BACKUP-SCHEDULER] Error reading schedule config:', err);
        }
        return { ...DEFAULT_SCHEDULE };
    }
    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[BACKUP-SCHEDULER] Error saving schedule config:', err);
        }
        return this.config;
    }
    getConfig() {
        return { ...this.config };
    }
    getStatus() {
        const nextRunAt = this.calculateNextRun();
        return {
            ...this.config,
            nextRunAt: nextRunAt ? nextRunAt.toISOString() : undefined,
        };
    }
    startRunner() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        // Check schedule every 60 seconds
        this.timer = setInterval(() => {
            this.checkAndExecute();
        }, 60000);
        console.log('[BACKUP-SCHEDULER] Automated backup runner initialized.');
    }
    stopRunner() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    calculateNextRun() {
        if (!this.config.enabled)
            return null;
        const now = new Date();
        if (this.config.frequency === 'interval') {
            const intervalMs = (this.config.intervalHours || 6) * 3600 * 1000;
            if (this.config.lastRunAt) {
                const last = new Date(this.config.lastRunAt).getTime();
                const nextTime = last + intervalMs;
                if (nextTime > now.getTime()) {
                    return new Date(nextTime);
                }
            }
            return new Date(now.getTime() + intervalMs);
        }
        const [hoursStr, minutesStr] = (this.config.timeOfDay || '04:00').split(':');
        const targetHour = parseInt(hoursStr || '4', 10);
        const targetMinute = parseInt(minutesStr || '0', 10);
        if (this.config.frequency === 'daily') {
            const next = new Date(now);
            next.setHours(targetHour, targetMinute, 0, 0);
            if (next.getTime() <= now.getTime()) {
                next.setDate(next.getDate() + 1);
            }
            return next;
        }
        if (this.config.frequency === 'weekly') {
            const days = this.config.daysOfWeek && this.config.daysOfWeek.length > 0 ? this.config.daysOfWeek : [0];
            // Check next 7 days for the closest match
            for (let offset = 0; offset <= 7; offset++) {
                const candidate = new Date(now);
                candidate.setDate(candidate.getDate() + offset);
                candidate.setHours(targetHour, targetMinute, 0, 0);
                if (days.includes(candidate.getDay())) {
                    if (candidate.getTime() > now.getTime()) {
                        return candidate;
                    }
                }
            }
            // Fallback 7 days ahead
            const fallback = new Date(now);
            fallback.setDate(fallback.getDate() + 7);
            fallback.setHours(targetHour, targetMinute, 0, 0);
            return fallback;
        }
        if (this.config.frequency === 'monthly') {
            const targetDay = Math.min(Math.max(this.config.dayOfMonth || 1, 1), 28); // Cap at 28 to be safe across all months
            const next = new Date(now);
            next.setDate(targetDay);
            next.setHours(targetHour, targetMinute, 0, 0);
            if (next.getTime() <= now.getTime()) {
                next.setMonth(next.getMonth() + 1);
            }
            return next;
        }
        // Default 24h fallback
        return new Date(now.getTime() + 24 * 3600 * 1000);
    }
    async checkAndExecute() {
        if (!this.config.enabled || this.isRunning)
            return;
        const nextRun = this.calculateNextRun();
        if (!nextRun)
            return;
        const now = Date.now();
        // If within 1 minute of scheduled time or past due since last check
        if (this.config.lastRunAt) {
            const last = new Date(this.config.lastRunAt).getTime();
            // Don't run twice within the same 5 minutes
            if (now - last < 5 * 60 * 1000) {
                return;
            }
        }
        // If interval mode and interval has elapsed:
        if (this.config.frequency === 'interval') {
            const intervalMs = (this.config.intervalHours || 6) * 3600 * 1000;
            if (this.config.lastRunAt) {
                const last = new Date(this.config.lastRunAt).getTime();
                if (now - last < intervalMs) {
                    return;
                }
            }
        }
        else {
            // For daily/weekly/monthly: check if current time matches target hour and minute
            const current = new Date();
            const [hoursStr, minutesStr] = (this.config.timeOfDay || '04:00').split(':');
            const targetHour = parseInt(hoursStr || '4', 10);
            const targetMinute = parseInt(minutesStr || '0', 10);
            if (current.getHours() !== targetHour || current.getMinutes() !== targetMinute) {
                return;
            }
            if (this.config.frequency === 'weekly') {
                const days = this.config.daysOfWeek || [0];
                if (!days.includes(current.getDay()))
                    return;
            }
            else if (this.config.frequency === 'monthly') {
                const targetDay = this.config.dayOfMonth || 1;
                if (current.getDate() !== targetDay)
                    return;
            }
        }
        // Execute automated backup
        await this.triggerScheduledBackup();
    }
    async triggerScheduledBackup() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        const tag = `auto_${this.config.frequency}`;
        console.log(`[BACKUP-SCHEDULER] Triggering automated snapshot (${tag})...`);
        try {
            const backup = await this.backupService.createBackup('hot_leveldb', tag);
            this.config.lastRunAt = new Date().toISOString();
            this.saveConfig({ lastRunAt: this.config.lastRunAt });
            console.log(`[BACKUP-SCHEDULER] Successfully created snapshot: ${backup.filename}`);
            // Apply retention pruning
            if (this.config.maxRetainedBackups && this.config.maxRetainedBackups > 0) {
                const pruned = this.backupService.pruneOldBackups(this.config.maxRetainedBackups);
                if (pruned > 0) {
                    console.log(`[BACKUP-SCHEDULER] Pruned ${pruned} older backup(s) exceeding retention limit (${this.config.maxRetainedBackups}).`);
                }
            }
        }
        catch (err) {
            console.error('[BACKUP-SCHEDULER] Error during automated backup execution:', err.message);
        }
        finally {
            this.isRunning = false;
        }
    }
}
