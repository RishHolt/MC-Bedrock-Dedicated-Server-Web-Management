import React from 'react'
import {
  Play,
  Square,
  RotateCw,
  Skull,
  Radio,
  Cpu,
  HardDrive,
  Users,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useServerStore } from '@/stores/serverStore'

export const Navbar: React.FC = () => {
  const {
    serverState,
    metrics,
    config,
    tunnel,
    startServer,
    stopServer,
    restartServer,
    killServer,
  } = useServerStore()

  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme')
        if (saved) return saved === 'dark'
        return document.documentElement.classList.contains('dark')
      } catch {}
    }
    return true
  })

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      try {
        localStorage.setItem('theme', 'dark')
      } catch {}
    } else {
      document.documentElement.classList.remove('dark')
      try {
        localStorage.setItem('theme', 'light')
      } catch {}
    }
  }, [isDark])

  const stateColor = {
    online: 'bg-muted text-foreground border-border',
    starting: 'bg-muted text-foreground border-border',
    stopping: 'bg-muted text-foreground border-border',
    updating: 'bg-muted text-foreground border-border',
    offline: 'bg-muted text-muted-foreground border-border',
  }[serverState]

  const pulseDot = {
    online: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    starting: 'bg-amber-500 animate-ping',
    stopping: 'bg-amber-500',
    updating: 'bg-primary animate-ping',
    offline: 'bg-muted-foreground',
  }[serverState]

  return (
    <header className="h-13 shrink-0 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Server Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-sm tracking-tight">
          <div className="size-7 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shadow-sm">
            <Sparkles className="size-4 text-foreground stroke-[2.2]" />
          </div>
          <span className="font-heading font-semibold text-foreground">
            {config.serverName}
          </span>
        </div>

        {/* State Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-wider ${stateColor}`}>
          <span className={`size-1.5 rounded-full ${pulseDot}`} />
          {serverState}
        </div>

        {/* Tunnel Status Indicator */}
        {tunnel.active && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border text-xs">
            <Radio className="size-3 text-foreground stroke-[2] animate-pulse" />
            <span className="font-mono text-[11px]">{tunnel.assignedAddress}:{tunnel.assignedPort}</span>
          </div>
        )}
      </div>

      {/* Telemetry Pills & Power Controls */}
      <div className="flex items-center gap-2">
        {/* Telemetry quick counters (when server is running) */}
        {serverState === 'online' && (
          <div className="hidden md:flex items-center gap-2 mr-2 text-xs font-mono text-foreground border-r border-border pr-3">
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border text-foreground">
              <Cpu className="size-3 text-foreground stroke-[2]" />
              <span>{metrics.cpuPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border text-foreground">
              <HardDrive className="size-3 text-foreground stroke-[2]" />
              <span>{metrics.ramUsedMB}MB</span>
            </div>
            <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border text-foreground">
              <Users className="size-3 text-foreground stroke-[2]" />
              <span>{metrics.activePlayers}/{config.maxPlayers}</span>
            </div>
          </div>
        )}

        {/* Lifecycle Buttons */}
        <div className="flex items-center gap-1">
          {serverState === 'offline' ? (
            <Button
              size="sm"
              onClick={startServer}
              className="gap-1.5 shadow-sm"
            >
              <Play className="size-3.5 fill-current" />
              <span>Start</span>
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={stopServer}
                disabled={serverState !== 'online'}
                className="gap-1 border-border text-foreground hover:bg-muted"
              >
                <Square className="size-3 fill-current" />
                <span>Stop</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={restartServer}
                disabled={serverState !== 'online'}
                className="gap-1 hover:text-foreground"
              >
                <RotateCw className="size-3.5 text-foreground stroke-[2]" />
                <span className="hidden sm:inline">Restart</span>
              </Button>
              <Button
                size="icon-sm"
                variant="destructive"
                onClick={killServer}
                title="Force Kill Process"
                className="size-7"
              >
                <Skull className="size-3.5" />
              </Button>
            </>
          )}

          {/* Theme Toggle */}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setIsDark(!isDark)}
            className="size-7 text-foreground hover:bg-muted ml-1"
          >
            {isDark ? <Sun className="size-3.5 text-foreground stroke-[2]" /> : <Moon className="size-3.5 text-foreground stroke-[2]" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
