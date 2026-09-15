import React from 'react'
import {
  Cpu,
  HardDrive,
  Users,
  Clock,
  Radio,
  Globe,
  Copy,
  Check,
  Terminal,
  ArrowUpRight,
  Shield,
  Activity,
  Zap,
  PackageCheck,
  Archive,
  UserX,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useServerStore } from '@/stores/serverStore'
import type { Player } from '@/types/server'
import { toast } from 'sonner'

export const DashboardView: React.FC = () => {
  const {
    metrics,
    config,
    players,
    tunnel,
    packs,
    backups,
    logs,
    serverState,
    setActiveTab,
    kickPlayer,
  } = useServerStore()

  const [copied, setCopied] = React.useState(false)
  const [playerToKick, setPlayerToKick] = React.useState<Player | null>(null)
  const [isKicking, setIsKicking] = React.useState(false)

  const copyAddress = () => {
    const addr = tunnel.active
      ? `${tunnel.assignedAddress}:${tunnel.assignedPort}`
      : `localhost:${config.serverPort}`
    navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Bedrock server address copied to clipboard')
  }

  const handleConfirmKick = async () => {
    if (!playerToKick) return
    setIsKicking(true)
    try {
      await kickPlayer(playerToKick.name)
      toast.success(`${playerToKick.name} has been kicked`)
      setPlayerToKick(null)
    } catch {
      toast.error(`Failed to kick ${playerToKick.name}`)
    } finally {
      setIsKicking(false)
    }
  }

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Banner / Announcement */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-foreground border border-border">
            <Globe className="size-4 text-foreground stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Direct Bedrock Address (UDP RakNet)</div>
            <div className="font-mono text-sm font-semibold flex items-center gap-2">
              <span>
                {tunnel.active
                  ? `${tunnel.assignedAddress}:${tunnel.assignedPort}`
                  : `127.0.0.1:${config.serverPort}`}
              </span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={copyAddress}
                className="size-6 text-foreground hover:bg-muted"
                title="Copy Bedrock Address"
              >
                {copied ? <Check className="size-3 text-foreground stroke-[2.5]" /> : <Copy className="size-3 text-foreground stroke-[2]" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1 border-border">
            <Activity className="size-3 text-foreground stroke-[2]" />
            <span>TPS: {metrics.tps.toFixed(1)}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 border-border">
            <Zap className="size-3 text-foreground stroke-[2]" />
            <span>Tick: {metrics.tickDurationMs.toFixed(1)}ms</span>
          </Badge>
          <Badge variant="outline" className="gap-1 border-border">
            <Clock className="size-3 text-foreground stroke-[2]" />
            <span>Up: {formatUptime(metrics.uptimeSeconds)}</span>
          </Badge>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CPU Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">CPU Usage</CardTitle>
            <Cpu className="size-3.5 text-foreground stroke-[2]" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-xl font-bold font-mono">
              {serverState === 'online' ? `${metrics.cpuPercent.toFixed(1)}%` : '0%'}
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${serverState === 'online' ? metrics.cpuPercent : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">BDS Process thread limit: {config.maxThreads}</p>
          </CardContent>
        </Card>

        {/* RAM Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Memory (RAM)</CardTitle>
            <HardDrive className="size-3.5 text-foreground stroke-[2]" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-xl font-bold font-mono">
              {serverState === 'online' ? `${metrics.ramUsedMB} MB` : '0 MB'}
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${serverState === 'online' ? (metrics.ramUsedMB / metrics.ramTotalMB) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Allocated Cap: {metrics.ramTotalMB} MB</p>
          </CardContent>
        </Card>

        {/* Active Players Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Online Players</CardTitle>
            <Users className="size-3.5 text-foreground stroke-[2]" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-xl font-bold font-mono">
              {serverState === 'online' ? `${players.length} / ${config.maxPlayers}` : '0 / 0'}
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${serverState === 'online' ? (players.length / config.maxPlayers) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Gamemode: {config.gamemode} ({config.difficulty})</p>
          </CardContent>
        </Card>

        {/* Network & Tunnel Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tunnel & Port</CardTitle>
            <Radio className="size-3.5 text-foreground stroke-[2]" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-sm font-bold font-mono truncate text-foreground">
              {tunnel.active ? 'playit.gg active' : 'Direct Host'}
            </div>
            <div className="text-xs font-mono text-muted-foreground flex justify-between">
              <span>Port: {config.serverPort} (UDP)</span>
              <span>v6: {config.serverPortV6}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">In: {metrics.netInKBps} KB/s · Out: {metrics.netOutKBps} KB/s</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Online Players & Quick Console Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Players List (1 column) */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div>
              <CardTitle className="text-sm">Online Players</CardTitle>
              <CardDescription className="text-xs">Live Xbox Live authenticated clients</CardDescription>
            </div>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setActiveTab('players')}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Manage <ArrowUpRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {players.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No players currently connected.
              </div>
            ) : (
              players.map((player) => (
                <div
                  key={player.xuid}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/30 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-6 rounded-md bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-foreground">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        <span>{player.name}</span>
                        {player.role === 'operator' && (
                          <Shield className="size-3 text-muted-foreground fill-muted-foreground/30" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Ping: {player.pingMs}ms
                      </div>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setPlayerToKick(player)}
                    className="text-destructive hover:bg-destructive/10 text-[11px] h-6 px-2"
                  >
                    Kick
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Live Console Preview (2 columns) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-foreground" />
              <div>
                <CardTitle className="text-sm">Server Console Stream</CardTitle>
                <CardDescription className="text-xs">Live stdout from Bedrock Dedicated Server</CardDescription>
              </div>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setActiveTab('console')}
              className="gap-1 text-xs"
            >
              Open Terminal <ArrowUpRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="bg-muted/30 font-mono text-[11px] p-3 rounded-lg border border-border/60 text-foreground h-52 overflow-y-auto space-y-1">
              {logs.slice(-8).map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line.startsWith('>') ? (
                    <span className="text-foreground font-bold">{line}</span>
                  ) : line.includes('[WARN]') ? (
                    <span className="text-amber-500 dark:text-amber-400 font-medium">{line}</span>
                  ) : line.includes('[ERROR]') ? (
                    <span className="text-rose-500 dark:text-rose-400">{line}</span>
                  ) : line.includes('[Player]') ? (
                    <span className="text-foreground/90 font-medium">{line}</span>
                  ) : (
                    <span className="text-muted-foreground">{line}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Summary: Add-ons & Backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Add-ons Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-foreground" />
              <div>
                <CardTitle className="text-xs font-medium">Installed Bedrock Packs</CardTitle>
                <CardDescription className="text-[11px]">Behavior & Resource Add-ons</CardDescription>
              </div>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setActiveTab('addons')}>
              Packs ({packs.filter((p) => p.enabled).length})
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {packs.slice(0, 3).map((pack) => (
              <div key={pack.id} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/20">
                <div className="truncate font-medium">{pack.name}</div>
                <Badge variant={pack.enabled ? 'default' : 'outline'} className="text-[9px] py-0 px-1.5">
                  {pack.type === 'behavior' ? 'BP' : 'RP'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Backups Card */}
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Archive className="size-4 text-foreground" />
              <div>
                <CardTitle className="text-xs font-medium">Safe LevelDB Snapshots</CardTitle>
                <CardDescription className="text-[11px]">Hot Bedrock world backups</CardDescription>
              </div>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setActiveTab('backups')}>
              Backups ({backups.length})
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {backups.slice(0, 3).map((bak) => (
              <div key={bak.id} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/20">
                <div className="truncate font-mono text-[11px]">{bak.filename}</div>
                <span className="text-[10px] text-muted-foreground">{(bak.sizeBytes / (1024 * 1024)).toFixed(1)}MB</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Kick Player Confirmation Dialog */}
      <Dialog open={!!playerToKick} onOpenChange={() => setPlayerToKick(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="size-5 text-destructive" />
              <span>Kick Player</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to kick <span className="font-semibold text-foreground">{playerToKick?.name}</span> from the server? They will be immediately disconnected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlayerToKick(null)}
              disabled={isKicking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmKick}
              disabled={isKicking}
            >
              {isKicking && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Kick Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
