import React, { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Trash2,
  Search,
  Sparkles,
  Wifi,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { useServerStore } from '@/stores/serverStore'
import type { Player } from '@/types/server'
import { toast } from 'sonner'

export const PlayersView: React.FC = () => {
  const {
    players,
    allowlist,
    fetchAllowlist,
    fetchOnlinePlayers,
    kickPlayer,
    setPlayerRole,
    addPlayerToAllowlist,
    removePlayerFromAllowlist,
    lookupXuid,
    config,
    updateConfig,
    saveConfig,
  } = useServerStore()

  const [activeSubTab, setActiveSubTab] = useState<'online' | 'allowlist' | 'permissions'>('online')
  const [newGamertag, setNewGamertag] = useState('')
  const [newXuid, setNewXuid] = useState('')
  const [newRole, setNewRole] = useState<'visitor' | 'member' | 'operator'>('member')
  const [ignoreLimit, setIgnoreLimit] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupSource, setLookupSource] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [kickConfirmPlayer, setKickConfirmPlayer] = useState<Player | null>(null)
  const [removeConfirmPlayer, setRemoveConfirmPlayer] = useState<Player | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  useEffect(() => {
    fetchAllowlist()
    fetchOnlinePlayers()
  }, [fetchAllowlist, fetchOnlinePlayers])

  // Debounced auto-resolve XUID as admin types gamertag
  useEffect(() => {
    const trimmed = newGamertag.trim()
    if (trimmed.length < 3) {
      setLookupSource(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true)
      const res = await lookupXuid(trimmed)
      setIsLookingUp(false)
      if (res && res.xuid) {
        setNewXuid(res.xuid)
        setLookupSource(res.source)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [newGamertag, lookupXuid])

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGamertag.trim() || !newXuid.trim()) return

    setIsActionLoading(true)
    try {
      await addPlayerToAllowlist({
        name: newGamertag.trim(),
        xuid: newXuid.trim(),
        role: newRole,
        ignoresPlayerLimit: ignoreLimit,
      })
      toast.success(`${newGamertag.trim()} added to allowlist`)
      setNewGamertag('')
      setNewXuid('')
      setNewRole('member')
      setIgnoreLimit(false)
      setLookupSource(null)
      setIsDialogOpen(false)
    } catch {
      toast.error('Failed to add player to allowlist')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleWhitelistToggle = async (checked: boolean) => {
    updateConfig('whitelist', checked)
    try {
      await saveConfig()
      toast.success(checked ? 'Allowlist enforcement enabled' : 'Allowlist enforcement disabled')
    } catch {
      toast.error('Failed to update allowlist setting')
    }
  }

  const handleKickConfirm = async () => {
    if (!kickConfirmPlayer) return
    setIsActionLoading(true)
    try {
      await kickPlayer(kickConfirmPlayer.name)
      toast.success(`${kickConfirmPlayer.name} has been kicked`)
      setKickConfirmPlayer(null)
    } catch {
      toast.error(`Failed to kick ${kickConfirmPlayer.name}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRemoveConfirm = async () => {
    if (!removeConfirmPlayer) return
    setIsActionLoading(true)
    try {
      await removePlayerFromAllowlist(removeConfirmPlayer.xuid)
      toast.success(`${removeConfirmPlayer.name} removed from allowlist`)
      setRemoveConfirmPlayer(null)
    } catch {
      toast.error(`Failed to remove ${removeConfirmPlayer.name}`)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleSetRole = async (xuid: string, role: 'visitor' | 'member' | 'operator', name: string) => {
    try {
      await setPlayerRole(xuid, role)
      toast.success(`${name}'s role changed to ${role}`)
    } catch {
      toast.error(`Failed to change role for ${name}`)
    }
  }

  const getRoleBadge = (role: Player['role']) => {
    switch (role) {
      case 'operator':
        return (
          <Badge variant="default" className="gap-1 text-[10px] font-medium">
            <Shield className="size-3 fill-primary-foreground/30 text-primary-foreground stroke-[2]" /> Operator
          </Badge>
        )
      case 'member':
        return (
          <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
            <ShieldCheck className="size-3 text-foreground stroke-[2]" /> Member
          </Badge>
        )
      case 'visitor':
        return (
          <Badge variant="outline" className="gap-1 text-[10px] font-medium">
            <ShieldAlert className="size-3 text-muted-foreground stroke-[2]" /> Visitor
          </Badge>
        )
    }
  }

  const filteredAllowlist = allowlist.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.xuid.includes(q)
  })

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5 text-foreground stroke-[2.2]" />
            <span>Player &amp; Permission Management</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage live RakNet sessions, server allowlist (allowlist.json), and player permissions (permissions.json)
          </p>
        </div>

        {/* Action / Add Player Dialog */}
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="gap-1.5 shadow-2xs" />}>
              <UserPlus className="size-3.5 stroke-[2]" />
              <span>Add to Allowlist</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Player to Bedrock Allowlist</DialogTitle>
                <DialogDescription>
                  Bedrock Dedicated Server authorizes players by their Xbox Live Gamertag and 16-digit XUID.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddPlayer} className="space-y-3.5 py-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label>Xbox Gamertag</label>
                    {isLookingUp && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" /> Looking up XUID...
                      </span>
                    )}
                    {!isLookingUp && lookupSource && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="size-3 stroke-[2]" /> Resolved via {lookupSource}
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. SteveCraft"
                    value={newGamertag}
                    onChange={(e) => setNewGamertag(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <label>XUID (Xbox Unique ID)</label>
                    <span className="text-[10px] text-muted-foreground font-mono">16 digits</span>
                  </div>
                  <Input
                    placeholder="2533..."
                    value={newXuid}
                    onChange={(e) => setNewXuid(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Default Permission Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['visitor', 'member', 'operator'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRole(r)}
                        className={`p-2 rounded-lg border text-xs capitalize transition-colors font-medium ${
                          newRole === r
                            ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium">Ignore Player Limit</div>
                    <div className="text-[10px] text-muted-foreground">Allows player to join even if server is full</div>
                  </div>
                  <Switch checked={ignoreLimit} onCheckedChange={setIgnoreLimit} />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="shadow-2xs">
                    Save to Allowlist
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveSubTab('online')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'online'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Online Players ({players.length})
          </button>
          <button
            onClick={() => setActiveSubTab('allowlist')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'allowlist'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Allowlist ({allowlist.length})
          </button>
          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'permissions'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Permissions &amp; Ops
          </button>
        </div>

        {/* Global Whitelist Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Enforce Allowlist:</span>
          <Switch
            checked={config.whitelist}
            onCheckedChange={handleWhitelistToggle}
          />
        </div>
      </div>

      {/* Search Input for Allowlist & Permissions */}
      {activeSubTab !== 'online' && (
        <div className="relative max-w-sm">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground stroke-[2]" />
          <Input
            placeholder="Search by Gamertag or XUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      )}

      {/* View Content based on Sub-tab */}
      {activeSubTab === 'online' && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Player Connections</CardTitle>
            <CardDescription className="text-xs">
              Live Bedrock sessions connected through RakNet UDP port {config.serverPort}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No players currently connected.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>XUID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Ping</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => (
                    <TableRow key={p.xuid}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <div className="size-6 rounded-md bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-foreground">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{p.name}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.xuid}</TableCell>
                      <TableCell>{getRoleBadge(p.role)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Wifi className="size-3 text-muted-foreground stroke-[2]" />
                          {p.pingMs || 15} ms
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.joinedAt || 'Active'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleSetRole(p.xuid, p.role === 'operator' ? 'member' : 'operator', p.name)}
                          className="text-xs"
                        >
                          {p.role === 'operator' ? 'De-op' : 'Make Op'}
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => setKickConfirmPlayer(p)}
                          className="text-xs"
                        >
                          Kick
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'allowlist' && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Allowlist Configuration (allowlist.json)</CardTitle>
            <CardDescription className="text-xs">
              Configured players authorized to join when whitelist mode is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAllowlist.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No players in allowlist. Click &quot;Add to Allowlist&quot; to permit users.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gamertag</TableHead>
                    <TableHead>XUID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bypass Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllowlist.map((p) => (
                    <TableRow key={p.xuid}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.xuid}</TableCell>
                      <TableCell>{getRoleBadge(p.role)}</TableCell>
                      <TableCell>
                        <Badge variant={p.ignoresPlayerLimit ? 'default' : 'outline'} className="text-[10px]">
                          {p.ignoresPlayerLimit ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setRemoveConfirmPlayer(p)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-6 p-0"
                          title="Remove from allowlist"
                        >
                          <Trash2 className="size-3 stroke-[2]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'permissions' && (
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Role &amp; Permission Hierarchy (permissions.json)</CardTitle>
            <CardDescription className="text-xs">
              Assign server permissions (Visitor, Member, Operator) mapped to player XUIDs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                  <ShieldAlert className="size-3.5 text-foreground stroke-[2]" />
                  <span>Visitor</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Players can explore the world but cannot interact with blocks, items, or attack entities.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                  <ShieldCheck className="size-3.5 text-foreground stroke-[2]" />
                  <span>Member</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Standard survival permissions. Players can break blocks, craft items, and fight mobs.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
                  <Shield className="size-3.5 text-foreground stroke-[2]" />
                  <span>Operator</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Has access to slash commands, teleportation, gamemode switching, and server administration.
                </p>
              </div>
            </div>

            {filteredAllowlist.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No players configured yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>XUID</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="text-right">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllowlist.map((p) => (
                    <TableRow key={p.xuid}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.xuid}</TableCell>
                      <TableCell>{getRoleBadge(p.role)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {(['visitor', 'member', 'operator'] as const).map((r) => (
                          <Button
                            key={r}
                            size="xs"
                            variant={p.role === r ? 'default' : 'outline'}
                            onClick={() => handleSetRole(p.xuid, r, p.name)}
                            className="capitalize text-[11px]"
                          >
                            {r}
                          </Button>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Kick Confirmation Dialog */}
      <Dialog open={!!kickConfirmPlayer} onOpenChange={() => setKickConfirmPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="size-5 text-destructive" />
              <span>Kick Player</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to kick <span className="font-semibold text-foreground">{kickConfirmPlayer?.name}</span> from the server? They can rejoin unless the allowlist is enforced.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickConfirmPlayer(null)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleKickConfirm} disabled={isActionLoading}>
              Kick Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Allowlist Confirmation Dialog */}
      <Dialog open={!!removeConfirmPlayer} onOpenChange={() => setRemoveConfirmPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              <span>Remove from Allowlist</span>
            </DialogTitle>
            <DialogDescription>
              Remove <span className="font-semibold text-foreground">{removeConfirmPlayer?.name}</span> from the allowlist? They will no longer be able to join when allowlist enforcement is active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveConfirmPlayer(null)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm} disabled={isActionLoading}>
              Remove Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
