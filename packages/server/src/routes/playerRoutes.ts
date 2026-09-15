import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PlayerService } from '../services/playerService.js'

export async function registerPlayerRoutes(fastify: FastifyInstance, playerService: PlayerService) {
  // Get all allowlisted players with permissions and status
  fastify.get('/api/players/allowlist', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const players = playerService.getAllowlist()
      return reply.send({ success: true, data: players })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Add or update player in allowlist & permissions
  fastify.post('/api/players/allowlist', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as {
        name: string
        xuid: string
        role?: 'visitor' | 'member' | 'operator'
        ignoresPlayerLimit?: boolean
      }

      if (!body || !body.name || !body.xuid) {
        return reply.status(400).send({ success: false, error: 'Gamertag and XUID are required' })
      }

      const player = await playerService.addOrUpdatePlayer({
        name: body.name.trim(),
        xuid: body.xuid.trim(),
        role: body.role || 'member',
        ignoresPlayerLimit: Boolean(body.ignoresPlayerLimit),
      })

      return reply.send({ success: true, data: player })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Remove player from allowlist
  fastify.delete('/api/players/allowlist/:xuid', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { xuid } = req.params as { xuid: string }
      const removed = await playerService.removePlayer(xuid)
      return reply.send({ success: removed })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Update player role
  fastify.post('/api/players/role', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as {
        xuid: string
        role: 'visitor' | 'member' | 'operator'
      }

      if (!body || !body.xuid || !body.role) {
        return reply.status(400).send({ success: false, error: 'XUID and role are required' })
      }

      const success = await playerService.setRole(body.xuid, body.role)
      return reply.send({ success })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Get currently connected online players
  fastify.get('/api/players/online', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const players = playerService.getOnlinePlayers()
      return reply.send({ success: true, data: players })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Kick a player
  fastify.post('/api/players/kick', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as { name: string; reason?: string }
      if (!body || !body.name) {
        return reply.status(400).send({ success: false, error: 'Player name is required' })
      }

      const kicked = playerService.kickPlayer(body.name, body.reason)
      return reply.send({ success: kicked })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // Resolve Xbox Gamertag to XUID
  fastify.get('/api/players/lookup', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = req.query as { gamertag?: string }
      if (!query.gamertag) {
        return reply.status(400).send({ success: false, error: 'gamertag query parameter is required' })
      }

      const result = await playerService.lookupXuid(query.gamertag)
      return reply.send({ success: true, ...result })
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })
}
