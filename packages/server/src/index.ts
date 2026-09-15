import fs from 'node:fs'
import path from 'node:path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import { BdsSupervisor } from './bds/supervisor.js'
import { ConfigService } from './services/configService.js'
import { BackupService } from './services/backupService.js'
import { BackupScheduleService } from './services/backupScheduleService.js'
import { FileService } from './services/fileService.js'
import { PlayerService } from './services/playerService.js'
import { AddonService } from './services/addonService.js'
import { registerServerRoutes } from './routes/serverRoutes.js'
import { registerConfigRoutes } from './routes/configRoutes.js'
import { registerBackupRoutes } from './routes/backupRoutes.js'
import { registerFileRoutes } from './routes/fileRoutes.js'
import { registerPlayerRoutes } from './routes/playerRoutes.js'
import { registerAddonRoutes } from './routes/addonRoutes.js'
import { registerWebSocketTerminal } from './ws/terminal.js'

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  })

  // Accept text/plain and arbitrary content types for POST/PUT
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body)
  })
  fastify.addContentTypeParser('*', { parseAs: 'string' }, (req, body, done) => {
    if (req.headers['content-type']?.startsWith('multipart/form-data')) {
      return done(null)
    }
    try {
      done(null, JSON.parse(body as string))
    } catch {
      done(null, body)
    }
  })

  // Register multipart support for pack uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024,
    },
  })

  // CORS for frontend communication
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // WebSocket support
  await fastify.register(websocket)

  // Initialize BDS process supervisor
  const supervisor = new BdsSupervisor()

  // Ensure BDS directory & configs exist
  supervisor.getInstaller().ensureDirectories()
  supervisor.getInstaller().ensureDefaultConfigs()

  const bdsDir = supervisor.getInstaller().getBdsDirectory()
  const configService = new ConfigService(bdsDir)
  const backupService = new BackupService(bdsDir, supervisor, configService)
  const backupScheduleService = new BackupScheduleService(bdsDir, backupService, supervisor)
  backupScheduleService.startRunner()
  const fileService = new FileService(bdsDir)
  const playerService = new PlayerService(bdsDir, supervisor)
  const addonService = new AddonService(bdsDir, configService)

  // Register API endpoints & WebSocket console
  await registerServerRoutes(fastify, supervisor)
  await registerConfigRoutes(fastify, configService)
  await registerBackupRoutes(fastify, backupService, backupScheduleService)
  await registerFileRoutes(fastify, fileService)
  await registerPlayerRoutes(fastify, playerService)
  await registerAddonRoutes(fastify, addonService)
  registerWebSocketTerminal(fastify, supervisor)

  // Serve static web app from packages/web/dist
  const cwd = process.cwd()
  let webDistDir = path.resolve(cwd, 'packages/web/dist')
  if (!fs.existsSync(webDistDir)) {
    webDistDir = path.resolve(cwd, '../web/dist')
  }

  if (fs.existsSync(webDistDir)) {
    await fastify.register(fastifyStatic, {
      root: webDistDir,
      prefix: '/',
    })

    fastify.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'Endpoint not found' })
      } else {
        reply.sendFile('index.html')
      }
    })
    console.log(`\x1b[32m[SERVER] Serving Web UI from ${webDistDir}\x1b[0m`)
  }

  const PORT = parseInt(process.env.PORT || '3001', 10)
  const HOST = process.env.HOST || '0.0.0.0'

  try {
    await fastify.listen({ port: PORT, host: HOST })
    console.log(`\x1b[32m[SERVER] Bedrock Management Daemon listening on http://${HOST}:${PORT}\x1b[0m`)
    console.log(`\x1b[36m[SERVER] BDS Runtime Directory: ${supervisor.getInstaller().getBdsDirectory()}\x1b[0m`)
    console.log(`\x1b[35m[SERVER] BDS Installed: ${supervisor.getInstaller().isInstalled()}\x1b[0m`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

bootstrap()
