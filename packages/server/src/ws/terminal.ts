import type { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import type { BdsSupervisor } from '../bds/supervisor.js'

export function registerWebSocketTerminal(fastify: FastifyInstance, supervisor: BdsSupervisor) {
  // Register WebSocket route for interactive BDS console
  fastify.get('/ws/console', { websocket: true }, (socket: WebSocket) => {
    // Send initial snapshot
    socket.send(
      JSON.stringify({
        type: 'init',
        state: supervisor.getState(),
        logs: supervisor.getLogs(),
        metrics: supervisor.getMetrics(),
        players: supervisor.getConnectedPlayers(),
      })
    )

    // Stream live logs to this client
    const onLog = (line: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'log', data: line }))
      }
    }

    // Stream state transitions (offline -> starting -> online -> stopping)
    const onState = (state: string) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'state', data: state, metrics: supervisor.getMetrics() }))
      }
    }

    const onPlayerConnected = (player: any) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'player_connected', data: player, metrics: supervisor.getMetrics() }))
      }
    }

    const onPlayerDisconnected = (player: any) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'player_disconnected', data: player, metrics: supervisor.getMetrics() }))
      }
    }

    supervisor.on('log', onLog)
    supervisor.on('state', onState)
    supervisor.on('player_connected', onPlayerConnected)
    supervisor.on('player_disconnected', onPlayerDisconnected)

    // Handle incoming commands from xterm.js / browser
    socket.on('message', (raw: Buffer | string) => {
      try {
        const text = raw.toString('utf-8')
        // Could be JSON or plain string
        let command = text
        try {
          const parsed = JSON.parse(text)
          if (parsed.type === 'command' && typeof parsed.command === 'string') {
            command = parsed.command
          }
        } catch {
          // not JSON, treat raw text as command
        }

        if (command.trim()) {
          supervisor.sendCommand(command)
        }
      } catch (err: any) {
        socket.send(JSON.stringify({ type: 'error', message: err.message }))
      }
    })

    const cleanup = () => {
      supervisor.off('log', onLog)
      supervisor.off('state', onState)
      supervisor.off('player_connected', onPlayerConnected)
      supervisor.off('player_disconnected', onPlayerDisconnected)
    }

    socket.on('close', cleanup)
    socket.on('error', cleanup)
  })
}
