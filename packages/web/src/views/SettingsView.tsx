import React, { useState } from 'react'
import {
  Sliders,
  Save,
  Check,
  FileCode,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useServerStore } from '@/stores/serverStore'
import type { BedrockConfig } from '@/types/server'
import { toast } from 'sonner'

export const SettingsView: React.FC = () => {
  const { config, updateConfig, saveConfig, fetchConfig, fetchRawConfig, saveRawConfig } = useServerStore()
  const [activeTab, setActiveTab] = useState<'visual' | 'raw'>('visual')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch initial config on mount
  React.useEffect(() => {
    fetchConfig()
    fetchRawConfig().then((t) => {
      if (t) setRawText(t)
    })
  }, [])

  // When switching to raw tab, sync raw text
  const handleSwitchTab = async (tab: 'visual' | 'raw') => {
    setActiveTab(tab)
    if (tab === 'raw') {
      const text = await fetchRawConfig()
      if (text) setRawText(text)
    }
  }

  const handleReload = async () => {
    setLoading(true)
    await fetchConfig()
    const text = await fetchRawConfig()
    if (text) setRawText(text)
    setLoading(false)
    toast.success('Configuration reloaded from disk')
  }

  const handleSave = async () => {
    setLoading(true)
    const ok = await saveConfig()
    setLoading(false)
    if (ok) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
      toast.success('server.properties saved successfully')
    } else {
      toast.error('Failed to save configuration')
    }
  }

  const handleRawSave = async () => {
    setLoading(true)
    const ok = await saveRawConfig(rawText)
    setLoading(false)
    if (ok) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
      toast.success('server.properties saved successfully')
    } else {
      toast.error('Failed to save raw configuration')
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Sliders className="size-5 text-foreground" />
            <span>Server Configuration (server.properties)</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure Bedrock gameplay, network sockets, world parameters, and thread limits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReload}
            disabled={loading}
            className="gap-1.5 text-xs border-border/60"
            title="Reload from disk"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </Button>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              onClick={() => handleSwitchTab('visual')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'visual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Visual Editor
            </button>
            <button
              onClick={() => handleSwitchTab('raw')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'raw'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Raw server.properties
            </button>
          </div>

          <Button
            size="sm"
            onClick={activeTab === 'visual' ? handleSave : handleRawSave}
            disabled={loading}
          >
            {savedSuccess ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
            <span>{savedSuccess ? 'Saved!' : loading ? 'Saving...' : 'Save Config'}</span>
          </Button>
        </div>
      </div>

      {activeTab === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* General Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">General &amp; Gameplay</CardTitle>
              <CardDescription className="text-xs">Basic server parameters and difficulty</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Server Name (MOTD)</label>
                <Input
                  value={config.serverName}
                  onChange={(e) => updateConfig('serverName', e.target.value)}
                  placeholder="Fabricator Bedrock Realm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Default Game Mode</label>
                  <select
                    value={config.gamemode}
                    onChange={(e) => updateConfig('gamemode', e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="survival">Survival</option>
                    <option value="creative">Creative</option>
                    <option value="adventure">Adventure</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Difficulty</label>
                  <select
                    value={config.difficulty}
                    onChange={(e) => updateConfig('difficulty', e.target.value as any)}
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="peaceful">Peaceful</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <div className="text-xs font-medium">Allow Cheats</div>
                  <div className="text-[10px] text-muted-foreground">Enables commands like /gamemode and /give</div>
                </div>
                <Switch
                  checked={config.allowCheats}
                  onCheckedChange={(checked) => updateConfig('allowCheats', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <div className="text-xs font-medium">Require Resource Pack</div>
                  <div className="text-[10px] text-muted-foreground">Clients must download server packs to join</div>
                </div>
                <Switch
                  checked={config.texturepackRequired}
                  onCheckedChange={(checked) => updateConfig('texturepackRequired', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* World & LevelDB */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">World &amp; LevelDB Storage</CardTitle>
              <CardDescription className="text-xs">World seed, directory name, and seed generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">World Name (Level Folder)</label>
                <Input
                  value={config.levelName}
                  onChange={(e) => updateConfig('levelName', e.target.value)}
                  placeholder="BedrockLevel"
                />
                <p className="text-[10px] text-muted-foreground">
                  Saved under <span className="font-mono">worlds/{config.levelName}/db</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">World Seed</label>
                <Input
                  value={config.levelSeed}
                  onChange={(e) => updateConfig('levelSeed', e.target.value)}
                  placeholder="Blank for random seed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Default Permission for New Players</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['visitor', 'member', 'operator'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateConfig('defaultPlayerPermissionLevel', lvl)}
                      className={`p-2 rounded-lg border text-xs capitalize transition-colors text-center ${
                        config.defaultPlayerPermissionLevel === lvl
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network & Access */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Network &amp; Security</CardTitle>
              <CardDescription className="text-xs">UDP RakNet socket bindings and player limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">IPv4 Port (UDP)</label>
                  <Input
                    type="number"
                    value={config.serverPort}
                    onChange={(e) => updateConfig('serverPort', parseInt(e.target.value) || 19132)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">IPv6 Port (UDP)</label>
                  <Input
                    type="number"
                    value={config.serverPortV6}
                    onChange={(e) => updateConfig('serverPortV6', parseInt(e.target.value) || 19133)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Max Simultaneous Players</label>
                <Input
                  type="number"
                  value={config.maxPlayers}
                  onChange={(e) => updateConfig('maxPlayers', parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <div className="text-xs font-medium">Xbox Live Authentication (Online Mode)</div>
                  <div className="text-[10px] text-muted-foreground">Authenticates player XUIDs with Microsoft servers</div>
                </div>
                <Switch
                  checked={config.onlineMode}
                  onCheckedChange={(checked) => updateConfig('onlineMode', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance & Simulation Distance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Simulation &amp; Performance</CardTitle>
              <CardDescription className="text-xs">Chunk render distance, tick simulation, and threading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">View Distance (Chunks)</label>
                  <Input
                    type="number"
                    value={config.viewDistance}
                    onChange={(e) => updateConfig('viewDistance', parseInt(e.target.value) || 32)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Tick Distance (4 - 12)</label>
                  <Input
                    type="number"
                    value={config.tickDistance}
                    min={4}
                    max={12}
                    onChange={(e) => updateConfig('tickDistance', parseInt(e.target.value) || 4)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Worker Threads (max-threads)</label>
                  <Input
                    type="number"
                    value={config.maxThreads}
                    onChange={(e) => updateConfig('maxThreads', parseInt(e.target.value) || 8)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Idle Timeout (Minutes)</label>
                  <Input
                    type="number"
                    value={config.playerIdleTimeout}
                    onChange={(e) => updateConfig('playerIdleTimeout', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Raw Editor Card */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="size-4 text-foreground" />
              <span>Raw server.properties Editor</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct text editor for the native Bedrock configuration file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={18}
              className="w-full rounded-lg bg-muted/40 p-3 font-mono text-xs text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
