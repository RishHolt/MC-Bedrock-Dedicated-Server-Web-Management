import React from 'react'
import {
  LayoutDashboard,
  Terminal,
  Users,
  Sliders,
  Package,
  Archive,
  FolderTree,
  Radio,
  Server,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { useServerStore } from '@/stores/serverStore'
import { cn } from 'cn'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  badge?: string | number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'settings', label: 'Server Settings', icon: Sliders },
  { id: 'addons', label: 'Add-ons & Packs', icon: Package },
  { id: 'backups', label: 'Backups', icon: Archive },
  { id: 'files', label: 'File Manager', icon: FolderTree },
  { id: 'tunnels', label: 'playit.gg Tunnel', icon: Radio },
]

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, players, packs, backups, tunnel } = useServerStore()

  const getBadge = (id: string) => {
    if (id === 'players') return players.length > 0 ? players.length : undefined
    if (id === 'addons') return packs.filter((p) => p.enabled).length
    if (id === 'backups') return backups.length
    if (id === 'tunnels' && tunnel.active) return 'UP'
    return undefined
  }

  return (
    <aside className="w-60 border-r border-border bg-card/30 flex flex-col justify-between shrink-0 h-full max-h-full overflow-hidden select-none">
      {/* Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Management
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const badge = getBadge(item.id)

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group select-none text-left',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground font-medium'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn('size-4 shrink-0 transition-colors stroke-[2]', isActive ? 'text-primary-foreground' : 'text-foreground/80 group-hover:text-foreground')} />
                <span>{item.label}</span>
              </div>

              {badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded text-[10px] font-mono tracking-tight font-medium',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-foreground border border-border/60'
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bedrock Native Engine Footnote */}
      <div className="p-3 border-t border-border bg-muted/20 shrink-0">
        <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Server className="size-3.5 text-foreground stroke-[2]" />
              <span>Mojang BDS</span>
            </div>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-muted text-foreground border border-border rounded">
              v1.21.60
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span className="text-foreground">UDP (RakNet)</span>
            </div>
            <div className="flex justify-between">
              <span>Port:</span>
              <span className="text-foreground">19132</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-foreground">LevelDB</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
