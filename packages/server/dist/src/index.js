import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { BdsSupervisor } from './bds/supervisor.js';
import { registerServerRoutes } from './routes/serverRoutes.js';
import { registerWebSocketTerminal } from './ws/terminal.js';
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
    });
    // CORS for frontend communication
    await fastify.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    // WebSocket support
    await fastify.register(websocket);
    // Initialize BDS process supervisor
    const supervisor = new BdsSupervisor();
    // Ensure BDS directory & configs exist
    supervisor.getInstaller().ensureDirectories();
    supervisor.getInstaller().ensureDefaultConfigs();
    // Register endpoints
    await registerServerRoutes(fastify, supervisor);
    registerWebSocketTerminal(fastify, supervisor);
    const PORT = parseInt(process.env.PORT || '3001', 10);
    const HOST = process.env.HOST || '0.0.0.0';
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`\x1b[32m[SERVER] Bedrock Management Daemon listening on http://${HOST}:${PORT}\x1b[0m`);
        console.log(`\x1b[36m[SERVER] BDS Runtime Directory: ${supervisor.getInstaller().getBdsDirectory()}\x1b[0m`);
        console.log(`\x1b[35m[SERVER] BDS Installed: ${supervisor.getInstaller().isInstalled()}\x1b[0m`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
bootstrap();
