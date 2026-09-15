export async function registerServerRoutes(fastify, supervisor) {
    // GET /api/server/status
    fastify.get('/api/server/status', async () => {
        return {
            state: supervisor.getState(),
            installed: supervisor.getInstaller().isInstalled(),
            binaryPath: supervisor.getInstaller().getBinaryPath(),
            bdsDirectory: supervisor.getInstaller().getBdsDirectory(),
            metrics: supervisor.getMetrics(),
        };
    });
    // POST /api/server/start
    fastify.post('/api/server/start', async (_req, reply) => {
        try {
            await supervisor.start();
            return { success: true, state: supervisor.getState() };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // POST /api/server/stop
    fastify.post('/api/server/stop', async (_req, reply) => {
        try {
            await supervisor.stop();
            return { success: true, state: supervisor.getState() };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // POST /api/server/restart
    fastify.post('/api/server/restart', async (_req, reply) => {
        try {
            await supervisor.restart();
            return { success: true, state: supervisor.getState() };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // POST /api/server/kill
    fastify.post('/api/server/kill', async () => {
        supervisor.kill();
        return { success: true, state: supervisor.getState() };
    });
    // POST /api/server/command
    fastify.post('/api/server/command', async (req, reply) => {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            }
            catch { }
        }
        const command = body?.command;
        if (!command) {
            reply.status(400);
            return { success: false, error: 'Command is required' };
        }
        supervisor.sendCommand(command);
        return { success: true, command };
    });
    // GET /api/server/logs
    fastify.get('/api/server/logs', async () => {
        return { logs: supervisor.getLogs() };
    });
    // POST /api/server/install
    fastify.post('/api/server/install', async (_req, reply) => {
        try {
            await supervisor.getInstaller().downloadAndInstall();
            return { success: true, installed: true };
        }
        catch (err) {
            reply.status(500);
            return { success: false, error: err.message };
        }
    });
}
