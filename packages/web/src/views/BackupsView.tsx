import React, { useState, useEffect } from 'react'
import {
  Archive,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  Zap,
  Clock,
  AlertTriangle,
  HardDrive,
  FileArchive,
  RefreshCw,
  CalendarClock,
  Calendar,
  Tag,
  Check,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useServerStore } from '@/stores/serverStore'
import type { ScheduleFrequency } from '@/types/server'
import { toast } from 'sonner'

export const BackupsView: React.FC = () => {
  const {
    backups,
    schedule,
    createBackup,
    restoreBackup,
    deleteBackup,
    fetchBackups,
    fetchBackupSchedule,
    saveBackupSchedule,
    config,
  } = useServerStore()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedBackupType, setSelectedBackupType] = useState<'hot_leveldb' | 'cold_archive'>('hot_leveldb')
  const [customTag, setCustomTag] = useState('')
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [inProgressMsg, setInProgressMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Schedule modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [schedEnabled, setSchedEnabled] = useState(false)
  const [schedFrequency, setSchedFrequency] = useState<ScheduleFrequency>('daily')
  const [schedIntervalHours, setSchedIntervalHours] = useState(6)
  const [schedTimeOfDay, setSchedTimeOfDay] = useState('04:00')
  const [schedDaysOfWeek, setSchedDaysOfWeek] = useState<number[]>([0])
  const [schedDayOfMonth, setSchedDayOfMonth] = useState(1)
  const [schedRetention, setSchedRetention] = useState(10)
  const [schedSaving, setSchedSaving] = useState(false)

  useEffect(() => {
    fetchBackups()
    fetchBackupSchedule()
  }, [])

  // Sync schedule modal state when schedule updates
  useEffect(() => {
    if (schedule) {
      setSchedEnabled(schedule.enabled)
      setSchedFrequency(schedule.frequency)
      setSchedIntervalHours(schedule.intervalHours || 6)
      setSchedTimeOfDay(schedule.timeOfDay || '04:00')
      setSchedDaysOfWeek(schedule.daysOfWeek || [0])
      setSchedDayOfMonth(schedule.dayOfMonth || 1)
      setSchedRetention(schedule.maxRetainedBackups || 10)
    }
  }, [schedule])

  const handleRefresh = async () => {
    setLoading(true)
    await Promise.all([fetchBackups(), fetchBackupSchedule()])
    setLoading(false)
    toast.success('Snapshot list refreshed')
  }

  const handleCreate = async () => {
    setIsCreateOpen(false)
    setInProgressMsg(
      selectedBackupType === 'hot_leveldb'
        ? 'Executing save hold → save query → archiving LevelDB → save resume...'
        : 'Preparing cold archive of world files...'
    )
    const toastId = toast.loading('Creating backup snapshot...')
    try {
      await createBackup(selectedBackupType, customTag.trim() || undefined)
      toast.success('Backup snapshot created successfully!', { id: toastId })
    } catch {
      toast.error('Failed to create backup snapshot', { id: toastId })
    }
    setCustomTag('')
    setInProgressMsg(null)
  }

  const handleSaveSchedule = async () => {
    setSchedSaving(true)
    try {
      await saveBackupSchedule({
        enabled: schedEnabled,
        frequency: schedFrequency,
        intervalHours: schedIntervalHours,
        timeOfDay: schedTimeOfDay,
        daysOfWeek: schedDaysOfWeek,
        dayOfMonth: schedDayOfMonth,
        maxRetainedBackups: schedRetention,
      })
      toast.success('Backup schedule saved')
      setIsScheduleOpen(false)
    } catch {
      toast.error('Failed to save backup schedule')
    } finally {
      setSchedSaving(false)
    }
  }

  const toggleDayOfWeek = (day: number) => {
    if (schedDaysOfWeek.includes(day)) {
      if (schedDaysOfWeek.length > 1) {
        setSchedDaysOfWeek(schedDaysOfWeek.filter((d) => d !== day))
      }
    } else {
      setSchedDaysOfWeek([...schedDaysOfWeek, day].sort())
    }
  }

  const handleRestore = async (id: string) => {
    setRestoreConfirmId(null)
    setIsActionLoading(true)
    setInProgressMsg('Restoring LevelDB files from snapshot...')
    const toastId = toast.loading('Restoring world from backup...')
    try {
      await restoreBackup(id)
      toast.success('World restored successfully!', { id: toastId })
    } catch {
      toast.error('Failed to restore backup', { id: toastId })
    } finally {
      setIsActionLoading(false)
      setInProgressMsg(null)
    }
  }

  const handleDownload = (id: string) => {
    window.open(`/api/backups/${encodeURIComponent(id)}/download`, '_blank')
    toast.info('Downloading backup archive...')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    setIsActionLoading(true)
    const toastId = toast.loading('Deleting backup...')
    try {
      await deleteBackup(deleteConfirmId)
      toast.success('Backup deleted', { id: toastId })
      setDeleteConfirmId(null)
    } catch {
      toast.error('Failed to delete backup', { id: toastId })
    } finally {
      setIsActionLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="size-5 text-foreground stroke-[2.2]" />
            <span>Safe Backups &amp; Snapshots</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            LevelDB hot backups using Bedrock save hold/query protocols without stopping the server
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5 text-xs border-border/60"
            title="Refresh snapshot list"
          >
            <RefreshCw className={`size-3.5 text-foreground ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          {/* Schedule Settings Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsScheduleOpen(true)}
            className="gap-1.5 text-xs"
          >
            <CalendarClock className="size-3.5 text-foreground" />
            <span>Schedule Settings</span>
            {schedule?.enabled && (
              <span className="size-1.5 rounded-full bg-foreground animate-pulse" />
            )}
          </Button>

          {/* Create Backup Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-1.5 shadow-sm" />}>
              <Plus className="size-3.5" />
              <span>Create Snapshot</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create World Backup</DialogTitle>
                <DialogDescription>
                  Choose the snapshot method and optional label for world "{config.levelName}".
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {/* Hot Backup Option */}
                <div
                  onClick={() => setSelectedBackupType('hot_leveldb')}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBackupType === 'hot_leveldb'
                      ? 'bg-muted border-foreground/30 text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-xs text-foreground mb-1">
                    <Zap className="size-4 text-foreground" />
                    <span>Hot LevelDB Backup (Recommended)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sends <span className="font-mono font-semibold text-foreground">save hold</span> and{' '}
                    <span className="font-mono font-semibold text-foreground">save query</span> to the running server. Flushes DB memory safely without disconnecting players.
                  </p>
                </div>

                {/* Cold Backup Option */}
                <div
                  onClick={() => setSelectedBackupType('cold_archive')}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBackupType === 'cold_archive'
                      ? 'bg-muted border-foreground/30 text-foreground'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-xs text-foreground mb-1">
                    <HardDrive className="size-4 text-foreground" />
                    <span>Cold Offline Archive</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Stops server writes completely to make a complete filesystem copy. Recommended before major Minecraft Bedrock version updates.
                  </p>
                </div>

                {/* Custom Label / Tag */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" />
                    <span>Custom Snapshot Label (Optional)</span>
                  </label>
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="e.g. before-boss-fight or pre-expansion"
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Included in the filename for easy identification.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} className="shadow-sm">
                  Start Backup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Automated Backup Schedule Banner */}
      {schedule?.enabled && (
        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-foreground shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-muted border border-border text-foreground">
              <CalendarClock className="size-4 text-foreground stroke-[2.2]" />
            </div>
            <div>
              <span className="font-semibold text-foreground">Automated Snapshots Active: </span>
              <span className="text-muted-foreground capitalize">{schedule.frequency} </span>
              {schedule.frequency === 'interval' && `(every ${schedule.intervalHours}h)`}
              {schedule.frequency === 'daily' && `at ${schedule.timeOfDay}`}
              {schedule.frequency === 'weekly' && `on ${schedule.daysOfWeek?.map((d) => dayLabels[d]).join(', ')} at ${schedule.timeOfDay}`}
              {schedule.frequency === 'monthly' && `on day ${schedule.dayOfMonth} at ${schedule.timeOfDay}`}
              {schedule.maxRetainedBackups > 0 && ` • Retention: keep last ${schedule.maxRetainedBackups}`}
            </div>
          </div>
          {schedule.nextRunAt && (
            <div className="text-[11px] font-mono font-medium text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border">
              Next: {new Date(schedule.nextRunAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* In-progress Banner */}
      {inProgressMsg && (
        <div className="p-3.5 rounded-xl bg-card border border-border text-foreground text-xs flex items-center gap-2.5 animate-pulse shadow-2xs">
          <div className="p-1.5 rounded-lg bg-muted border border-border text-foreground">
            <Clock className="size-4 text-foreground stroke-[2.2]" />
          </div>
          <span className="font-medium">{inProgressMsg}</span>
        </div>
      )}

      {/* Backups Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Snapshot History</CardTitle>
          <CardDescription className="text-xs">
            Stored snapshots in the backups/ directory. Click download to export or restore to roll back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Snapshot File</TableHead>
                <TableHead>World</TableHead>
                <TableHead>Method &amp; Tag</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((bak) => (
                <TableRow key={bak.id}>
                  <TableCell className="font-mono text-xs font-medium flex items-center gap-2">
                    <FileArchive className="size-4 text-foreground stroke-[2] shrink-0" />
                    <span className="truncate max-w-[240px]" title={bak.filename}>{bak.filename}</span>
                  </TableCell>
                  <TableCell className="text-xs">{bak.worldName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          bak.type === 'hot_leveldb'
                            ? 'border-border text-foreground bg-muted'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {bak.type === 'hot_leveldb' ? 'Hot LevelDB' : 'Cold Archive'}
                      </Badge>
                      {bak.tag && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {bak.tag.startsWith('auto_') ? `Auto (${bak.tag.replace('auto_', '')})` : bak.tag}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatSize(bak.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{bak.createdAt}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleDownload(bak.id)}
                      title="Download Zip"
                    >
                      <Download className="size-3.5 text-foreground stroke-[2]" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setRestoreConfirmId(bak.id)}
                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      title="Restore World"
                    >
                      <RotateCcw className="size-3.5 stroke-[2]" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(bak.id)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete Backup"
                    >
                      <Trash2 className="size-3.5 stroke-[2]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {backups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No snapshots found. Click "Create Snapshot" above to create your first safe backup!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Configuration Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-foreground" />
              <span>Automated Snapshot Schedule</span>
            </DialogTitle>
            <DialogDescription>
              Configure recurring background LevelDB snapshots and retention limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Enabled Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
              <div>
                <div className="font-medium">Enable Recurring Snapshots</div>
                <div className="text-[11px] text-muted-foreground">Automatically run hot LevelDB backups on schedule</div>
              </div>
              <Switch checked={schedEnabled} onCheckedChange={setSchedEnabled} />
            </div>

            {/* Frequency Selector */}
            <div className="space-y-1.5">
              <label className="font-medium">Backup Frequency</label>
              <div className="grid grid-cols-4 gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
                {(['interval', 'daily', 'weekly', 'monthly'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSchedFrequency(mode)}
                    className={`py-1 rounded text-xs capitalize transition-colors font-medium ${
                      schedFrequency === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval Mode Config */}
            {schedFrequency === 'interval' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/40">
                <label className="font-medium">Run Every (Hours)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 3, 6, 12, 24].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setSchedIntervalHours(hr)}
                      className={`py-1 rounded text-xs font-mono border transition-colors ${
                        schedIntervalHours === hr
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : 'border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {hr}h
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Mode Config */}
            {schedFrequency === 'daily' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/40">
                <label className="font-medium">Execution Time of Day (24-Hour Clock)</label>
                <Input
                  type="time"
                  value={schedTimeOfDay}
                  onChange={(e) => setSchedTimeOfDay(e.target.value)}
                  className="font-mono text-xs w-36"
                />
              </div>
            )}

            {/* Weekly Mode Config */}
            {schedFrequency === 'weekly' && (
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="space-y-1">
                  <label className="font-medium">Days of Week</label>
                  <div className="grid grid-cols-7 gap-1">
                    {dayLabels.map((lbl, idx) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => toggleDayOfWeek(idx)}
                        className={`py-1 text-[11px] rounded border transition-colors font-medium ${
                          schedDaysOfWeek.includes(idx)
                            ? 'border-primary bg-primary text-primary-foreground font-semibold'
                            : 'border-border/60 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-medium">Execution Time</label>
                  <Input
                    type="time"
                    value={schedTimeOfDay}
                    onChange={(e) => setSchedTimeOfDay(e.target.value)}
                    className="font-mono text-xs w-36"
                  />
                </div>
              </div>
            )}

            {/* Monthly Mode Config */}
            {schedFrequency === 'monthly' && (
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/20 border border-border/40">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium">Day of Month (1 - 28)</label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={schedDayOfMonth}
                      onChange={(e) => setSchedDayOfMonth(parseInt(e.target.value, 10) || 1)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium">Execution Time</label>
                    <Input
                      type="time"
                      value={schedTimeOfDay}
                      onChange={(e) => setSchedTimeOfDay(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Retention Limit */}
            <div className="space-y-1.5">
              <label className="font-medium">Retention Policy (Auto-Prune)</label>
              <div className="flex items-center gap-2">
                <select
                  value={schedRetention}
                  onChange={(e) => setSchedRetention(parseInt(e.target.value, 10))}
                  className="w-full h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={5}>Keep last 5 snapshots</option>
                  <option value={10}>Keep last 10 snapshots (Recommended)</option>
                  <option value={20}>Keep last 20 snapshots</option>
                  <option value={50}>Keep last 50 snapshots</option>
                  <option value={0}>Keep all (No automatic deletion)</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                When snapshots exceed this count, the oldest automated backups are pruned automatically.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={schedSaving}
              className="gap-1.5 shadow-sm"
            >
              <Check className="size-3.5" />
              <span>{schedSaving ? 'Saving...' : 'Save Schedule'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreConfirmId} onOpenChange={() => setRestoreConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="size-5" />
              <span>Confirm World Restore</span>
            </DialogTitle>
            <DialogDescription>
              Restoring will overwrite current LevelDB world data for "{config.levelName}".
              Ensure any active players have saved their progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirmId(null)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isActionLoading}
              onClick={() => restoreConfirmId && handleRestore(restoreConfirmId)}
            >
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <span>Delete Backup</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this backup snapshot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isActionLoading}>
              Delete Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
