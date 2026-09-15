import fs from 'node:fs'
import type { FastifyInstance } from 'fastify'
import type { BackupService } from '../services/backupService.js'
import type { BackupScheduleService } from '../services/backupScheduleService.js'

export async function registerBackupRoutes(
  fastify: FastifyInstance,
  backupService: BackupService,
  scheduleService?: BackupScheduleService
) {
  // GET /api/backups
  fastify.get('/api/backups', async () => {
    return { backups: backupService.getBackups() }
  })

  // POST /api/backups/create
  fastify.post('/api/backups/create', async (req: any, reply) => {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {}
    }
    const type = body?.type === 'cold_archive' ? 'cold_archive' : 'hot_leveldb'
    const customTag = typeof body?.customTag === 'string' ? body.customTag : undefined

    try {
      const record = await backupService.createBackup(type, customTag)
      return { success: true, backup: record }
    } catch (err: any) {
      reply.status(500)
      return { success: false, error: err.message }
    }
  })

  // GET /api/backups/schedule
  fastify.get('/api/backups/schedule', async () => {
    if (!scheduleService) {
      return { schedule: null }
    }
    return { schedule: scheduleService.getStatus() }
  })

  // POST /api/backups/schedule
  fastify.post('/api/backups/schedule', async (req: any, reply) => {
    if (!scheduleService) {
      reply.status(500)
      return { success: false, error: 'Schedule service not initialized' }
    }

    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {}
    }

    if (!body || typeof body !== 'object') {
      reply.status(400)
      return { success: false, error: 'Expected schedule configuration object' }
    }

    const updated = scheduleService.saveConfig(body)
    return { success: true, schedule: scheduleService.getStatus() }
  })

  // POST /api/backups/:id/restore
  fastify.post('/api/backups/:id/restore', async (req: any, reply) => {
    const { id } = req.params
    try {
      await backupService.restoreBackup(id)
      return { success: true, restoredId: id }
    } catch (err: any) {
      reply.status(500)
      return { success: false, error: err.message }
    }
  })

  // DELETE /api/backups/:id
  fastify.delete('/api/backups/:id', async (req: any, reply) => {
    const { id } = req.params
    try {
      const deleted = backupService.deleteBackup(id)
      return { success: deleted }
    } catch (err: any) {
      reply.status(404)
      return { success: false, error: err.message }
    }
  })

  // GET /api/backups/:id/download
  fastify.get('/api/backups/:id/download', async (req: any, reply) => {
    const { id } = req.params
    try {
      const zipPath = backupService.getBackupPath(id)
      const stream = fs.createReadStream(zipPath)
      reply.header('Content-Disposition', `attachment; filename="${id}.zip"`)
      reply.header('Content-Type', 'application/zip')
      return reply.send(stream)
    } catch (err: any) {
      reply.status(404)
      return { success: false, error: err.message }
    }
  })
}
