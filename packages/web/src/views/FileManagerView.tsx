import React, { useState, useEffect } from 'react'
import {
  FolderTree,
  Folder,
  File,
  FileText,
  FileCode,
  Download,
  Edit,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Save,
  Plus,
  RefreshCw,
  FolderPlus,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useServerStore } from '@/stores/serverStore'
import type { FileItem } from '@/types/server'
import { toast } from 'sonner'

export const FileManagerView: React.FC = () => {
  const { files, fetchFiles, readFile, writeFile, deleteFile, createDirectory } = useServerStore()
  const [currentFolder, setCurrentFolder] = useState('/')
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<FileItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // New folder dialog
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // New file dialog
  const [isNewFileOpen, setIsNewFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [isCreatingFile, setIsCreatingFile] = useState(false)

  // Load files when folder changes
  useEffect(() => {
    setLoading(true)
    fetchFiles(currentFolder).finally(() => setLoading(false))
  }, [currentFolder])

  const handleRefresh = () => {
    setLoading(true)
    fetchFiles(currentFolder).finally(() => {
      setLoading(false)
      toast.success('File list refreshed')
    })
  }

  const handleNavigate = (path: string) => {
    setCurrentFolder(path)
  }

  const handleNavigateUp = () => {
    if (currentFolder === '/') return
    const parts = currentFolder.split('/').filter(Boolean)
    parts.pop()
    const parent = parts.length === 0 ? '/' : '/' + parts.join('/')
    setCurrentFolder(parent)
  }

  const handleOpenFile = async (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentFolder(file.path)
      return
    }

    setLoading(true)
    const content = await readFile(file.path)
    setFileContent(content)
    setEditingFile(file)
    setLoading(false)
  }

  const handleSaveFile = async () => {
    if (!editingFile) return
    setSaveLoading(true)
    const ok = await writeFile(editingFile.path, fileContent)
    setSaveLoading(false)
    if (ok) {
      toast.success(`"${editingFile.name}" saved successfully`)
      setEditingFile(null)
    } else {
      toast.error(`Failed to save "${editingFile.name}"`)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTarget) return
    setIsDeleting(true)
    try {
      await deleteFile(deleteConfirmTarget.path)
      toast.success(`"${deleteConfirmTarget.name}" deleted permanently`)
      setDeleteConfirmTarget(null)
    } catch {
      toast.error(`Failed to delete "${deleteConfirmTarget.name}"`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    const target = currentFolder === '/'
      ? `/${newFolderName.trim()}`
      : `${currentFolder}/${newFolderName.trim()}`
    try {
      await createDirectory(target)
      toast.success(`Folder "${newFolderName.trim()}" created`)
      setNewFolderName('')
      setIsNewFolderOpen(false)
    } catch {
      toast.error('Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return
    setIsCreatingFile(true)
    const target = currentFolder === '/'
      ? `/${newFileName.trim()}`
      : `${currentFolder}/${newFileName.trim()}`
    try {
      await writeFile(target, '')
      toast.success(`File "${newFileName.trim()}" created`)
      setNewFileName('')
      setIsNewFileOpen(false)
    } catch {
      toast.error('Failed to create file')
    } finally {
      setIsCreatingFile(false)
    }
  }

  const handleDownload = (file: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, '_blank')
    toast.info(`Downloading "${file.name}"...`)
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="size-4 text-foreground fill-muted stroke-[2]" />
    }
    if (file.extension === 'json') {
      return <FileCode className="size-4 text-foreground stroke-[2]" />
    }
    if (file.extension === 'properties' || file.extension === 'txt' || file.extension === 'log') {
      return <FileText className="size-4 text-foreground stroke-[2]" />
    }
    return <File className="size-4 text-foreground stroke-[2]" />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Breadcrumb segments
  const pathSegments = currentFolder.split('/').filter(Boolean)

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FolderTree className="size-5 text-foreground stroke-[2.2]" />
            <span>Server File Manager</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Browse BDS directory, edit configurations, inspect packs, and manage files
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5 text-xs border-border/60"
          >
            <RefreshCw className={`size-3.5 text-foreground ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNewFolderOpen(true)}
            className="gap-1.5 text-xs border-border/60"
          >
            <FolderPlus className="size-3.5 text-foreground stroke-[2]" />
            <span>New Folder</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewFileOpen(true)}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>New File</span>
          </Button>
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono overflow-x-auto">
        {currentFolder !== '/' && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleNavigateUp}
            title="Up one folder"
            className="mr-1"
          >
            <ArrowLeft className="size-3.5" />
          </Button>
        )}
        <button
          onClick={() => handleNavigate('/')}
          className={`hover:text-foreground transition-colors ${
            currentFolder === '/' ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        >
          server_root
        </button>
        {pathSegments.map((seg, idx) => {
          const segPath = '/' + pathSegments.slice(0, idx + 1).join('/')
          const isLast = idx === pathSegments.length - 1
          return (
            <React.Fragment key={segPath}>
              <ChevronRight className="size-3 text-muted-foreground" />
              <button
                onClick={() => handleNavigate(segPath)}
                className={`hover:text-foreground transition-colors ${
                  isLast ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {seg}
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {/* Files Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow
                  key={file.path}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => handleOpenFile(file)}
                >
                  <TableCell className="font-medium flex items-center gap-2.5">
                    {getFileIcon(file)}
                    <span className="font-mono text-xs">{file.name}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {file.type}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatSize(file.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {file.modifiedAt}
                  </TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {file.type === 'file' && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleOpenFile(file)}
                        title="Edit File"
                      >
                        <Edit className="size-3.5 text-foreground stroke-[2]" />
                      </Button>
                    )}
                    {file.type === 'file' && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDownload(file)}
                        title="Download File"
                      >
                        <Download className="size-3.5 text-foreground stroke-[2]" />
                      </Button>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setDeleteConfirmTarget(file)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5 stroke-[2]" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {files.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    This folder is empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* File Editor Modal */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <FileCode className="size-4 text-foreground" />
              <span>{editingFile?.name}</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">({editingFile?.path})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={16}
              className="w-full rounded-lg bg-muted/40 p-3 font-mono text-xs text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveFile}
              disabled={saveLoading}
              className="gap-1.5 shadow-sm"
            >
              {saveLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmTarget} onOpenChange={() => setDeleteConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive text-sm flex items-center gap-2">
              <Trash2 className="size-4" />
              <span>Confirm Delete</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-mono text-foreground font-semibold">{deleteConfirmTarget?.path}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs font-medium">Folder Name</label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. scripts or logs"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              disabled={isCreatingFolder}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderOpen(false)} disabled={isCreatingFolder}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="shadow-sm" disabled={isCreatingFolder}>
              {isCreatingFolder ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Modal */}
      <Dialog open={isNewFileOpen} onOpenChange={setIsNewFileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Create New File</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-xs font-medium">File Name</label>
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. motd.txt or rules.json"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              disabled={isCreatingFile}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFileOpen(false)} disabled={isCreatingFile}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} className="shadow-sm" disabled={isCreatingFile}>
              {isCreatingFile ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
