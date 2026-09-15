import React, { useState, useEffect, useRef } from 'react'
import {
  Package,
  UploadCloud,
  FileArchive,
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Info,
  Search,
  Loader2,
  FolderArchive,
  Settings2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useServerStore } from '@/stores/serverStore'
import type { AddonPack } from '@/types/server'

export const AddonsView: React.FC = () => {
  const { packs, fetchPacks, togglePack, uploadPack, deletePack } = useServerStore()
  const [filter, setFilter] = useState<'all' | 'behavior' | 'resource'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [packToDelete, setPackToDelete] = useState<AddonPack | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    fetchPacks()
  }, [fetchPacks])

  const customPacksCount = packs.filter((p) => !p.isSystem).length

  const filteredPacks = packs.filter((p) => {
    if (p.isSystem) return false
    if (filter !== 'all' && p.type !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchDesc = p.description.toLowerCase().includes(q)
      const matchUuid = p.uuid.toLowerCase().includes(q)
      if (!matchName && !matchDesc && !matchUuid) return false
    }
    return true
  })

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setIsUploading(true)
    setUploadMessage(null)

    let totalInstalled = 0
    let lastError: string | null = null

    for (const file of fileArray) {
      const result = await uploadPack(file)
      if (result.success) {
        totalInstalled += result.count || 1
      } else if (result.error) {
        lastError = result.error
      }
    }

    setIsUploading(false)
    if (totalInstalled > 0) {
      setUploadMessage({
        type: 'success',
        text: `Extracted & installed ${totalInstalled} pack(s) successfully!`,
      })
      setTimeout(() => setUploadMessage(null), 4500)
    } else if (lastError) {
      setUploadMessage({
        type: 'error',
        text: `Upload failed: ${lastError}`,
      })
      setTimeout(() => setUploadMessage(null), 6000)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  const confirmDelete = async () => {
    if (!packToDelete) return
    await deletePack(packToDelete.uuid)
    setPackToDelete(null)
  }

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Package className="size-5 text-foreground stroke-[2.2]" />
            <span>Add-ons &amp; Pack Manager</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Install, configure, and toggle Behavior Packs (.mcpack) and Resource Packs for Bedrock Dedicated Server worlds
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({customPacksCount})
            </button>
            <button
              onClick={() => setFilter('behavior')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'behavior'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Behavior ({packs.filter((p) => !p.isSystem && p.type === 'behavior').length})
            </button>
            <button
              onClick={() => setFilter('resource')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'resource'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Resource ({packs.filter((p) => !p.isSystem && p.type === 'resource').length})
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5 shadow-2xs"
          >
            {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5 stroke-[2]" />}
            <span>Browse Files</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mcpack,.mcaddon,.zip"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-foreground/60 bg-muted/60'
            : 'border-border hover:border-foreground/40 bg-card/40'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="size-11 rounded-full bg-foreground/10 text-foreground flex items-center justify-center border border-foreground/20 shadow-2xs">
            {isUploading ? (
              <Loader2 className="size-5.5 text-foreground stroke-[2.2] animate-spin" />
            ) : (
              <UploadCloud className="size-5.5 text-foreground stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-foreground flex items-center justify-center gap-1.5 flex-wrap">
              <span>{isUploading ? 'Extracting & installing packs...' : 'Drag & Drop'}</span>
              <span className="font-mono font-bold text-foreground px-1.5 py-0.5 rounded bg-muted border border-border">.mcpack</span>
              <span>or</span>
              <span className="font-mono font-bold text-foreground px-1.5 py-0.5 rounded bg-muted border border-border">.mcaddon</span>
              <span>here, or click to browse</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Archives are automatically unzipped into behavior_packs/ or resource_packs/ and parsed via manifest.json
            </p>
          </div>
          {uploadMessage && (
            <div
              className={`mt-2 text-xs font-medium px-3 py-1 rounded-full shadow-2xs border ${
                uploadMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}
            >
              {uploadMessage.type === 'success' ? '✓ ' : '✕ '}
              {uploadMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pb-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground stroke-[2]" />
          <Input
            placeholder="Search packs by name, UUID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Packs Grid */}
      {filteredPacks.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-border bg-card/30">
          <FolderArchive className="size-10 text-muted-foreground mx-auto mb-2 opacity-50 stroke-[1.5]" />
          <h3 className="text-sm font-medium text-foreground">No add-on packs found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {customPacksCount === 0
              ? 'No custom behavior or resource packs have been uploaded yet. Drop an .mcpack or .mcaddon file above to get started.'
              : 'No packs match the selected filter criteria.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPacks.map((pack) => (
            <Card key={pack.id} className="relative overflow-hidden border border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-start gap-3">
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs border shadow-2xs ${
                      pack.type === 'behavior'
                        ? 'bg-muted border-border text-foreground font-mono'
                        : 'bg-muted/80 border-border text-foreground font-mono'
                    }`}
                  >
                    {pack.type === 'behavior' ? 'BP' : 'RP'}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      <span>{pack.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono border-border">
                        v{pack.version}
                      </Badge>
                      {pack.isSystem && (
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-mono">
                          Stock
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">By {pack.author}</CardDescription>
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {pack.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <Switch
                    checked={pack.enabled}
                    onCheckedChange={(checked) => togglePack(pack.uuid, pack.type, checked)}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs">
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                  {pack.description}
                </p>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span className="truncate max-w-[220px]" title={pack.uuid}>UUID: {pack.uuid}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatSize(pack.sizeBytes)}</span>
                    {!pack.isSystem && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setPackToDelete(pack)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive size-6 p-0"
                        title="Delete pack from disk"
                      >
                        <Trash2 className="size-3 stroke-[2]" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!packToDelete} onOpenChange={(open) => !open && setPackToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Add-on Pack</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{packToDelete?.name}</span>? This will unbind the pack from all worlds and permanently remove its folder from the server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPackToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
