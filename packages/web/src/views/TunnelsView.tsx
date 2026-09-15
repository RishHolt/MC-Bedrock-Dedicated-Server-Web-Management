import React, { useState } from 'react'
import {
  Radio,
  Copy,
  Check,
  Globe,
  Zap,
  Shield,
  ExternalLink,
  Power,
  Smartphone,
  Gamepad2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useServerStore } from '@/stores/serverStore'

export const TunnelsView: React.FC = () => {
  const { tunnel, toggleTunnel, config } = useServerStore()
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(`${tunnel.assignedAddress}:${tunnel.assignedPort}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="size-5 text-foreground stroke-[2.2]" />
            <span>playit.gg Bedrock Tunnel</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Expose your Bedrock UDP server to friends globally without router port forwarding (NAT traversal)
          </p>
        </div>

        <Button
          size="sm"
          variant={tunnel.active ? 'outline' : 'default'}
          onClick={toggleTunnel}
          className={`gap-1.5 shadow-sm ${
            tunnel.active
              ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border-amber-500/30'
              : ''
          }`}
        >
          <Power className="size-3.5" />
          <span>{tunnel.active ? 'Disconnect Tunnel' : 'Connect Tunnel'}</span>
        </Button>
      </div>

      {/* Main Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Tunnel Connection Status</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-border">
                  Simulation Preview
                </Badge>
              </div>
              <Badge
                variant={tunnel.active ? 'default' : 'secondary'}
                className="gap-1 text-xs"
              >
                <span
                  className={`size-1.5 rounded-full ${
                    tunnel.active ? 'bg-primary-foreground animate-pulse' : 'bg-muted-foreground'
                  }`}
                />
                {tunnel.active ? 'Active & Tunneling' : 'Tunnel Inactive'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Direct encrypted UDP tunnel routing to your local Bedrock Dedicated Server (Native daemon hookup documented in ROADMAP.md)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {tunnel.active ? (
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="text-xs text-muted-foreground">Public Bedrock Address for Players:</div>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border">
                  <div className="font-mono text-sm font-semibold text-foreground select-all">
                    {tunnel.assignedAddress}:{tunnel.assignedPort}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAddress}
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7"
                  >
                    {copied ? <Check className="size-3 text-foreground" /> : <Copy className="size-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 text-muted-foreground">
                  <div>
                    <span className="text-[10px] uppercase block text-muted-foreground/70">Local Bind</span>
                    <span className="text-foreground">127.0.0.1:{tunnel.targetPort} (UDP)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase block text-muted-foreground/70">Tunnel Latency</span>
                    <span className="text-foreground">{tunnel.pingLatencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase block text-muted-foreground/70">Protocol</span>
                    <span className="text-foreground">Bedrock RakNet</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
                <Radio className="size-8 mx-auto text-muted-foreground/40" />
                <p>The playit.gg tunnel is currently offline.</p>
                <p className="text-[11px]">Click "Connect Tunnel" above to establish a global tunnel.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console / Mobile Connect Guide */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="size-4 text-foreground stroke-[2]" />
              <span>Connecting from Devices</span>
            </CardTitle>
            <CardDescription className="text-xs">Supported Bedrock platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-foreground stroke-[2]" />
                <span>Windows, Android, iOS</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Go to Servers tab → "Add Server" → enter the public hostname and port above.
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Gamepad2 className="size-3.5 text-foreground stroke-[2]" />
                <span>Xbox, PlayStation, Switch</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Consoles do not allow custom IPs by default. Use BedrockConnect or friend proxying to join.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
