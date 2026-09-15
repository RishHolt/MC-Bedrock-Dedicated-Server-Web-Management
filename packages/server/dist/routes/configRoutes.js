export async function registerConfigRoutes(fastify, configService) {
    // GET /api/config
    fastify.get('/api/config', async () => {
        return { config: configService.parse() };
    });
    // POST /api/config
    fastify.post('/api/config', async (req, reply) => {
        let updates = req.body;
        if (typeof updates === 'string') {
            try {
                updates = JSON.parse(updates);
            }
            catch { }
        }
        if (!updates || typeof updates !== 'object') {
            reply.status(400);
            return { success: false, error: 'Expected JSON object of properties to update' };
        }
        const updated = configService.update(updates);
        return { success: true, config: updated };
    });
    // GET /api/config/raw
    fastify.get('/api/config/raw', async (_req, reply) => {
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        return configService.getRaw();
    });
    // POST /api/config/raw
    fastify.post('/api/config/raw', async (req, reply) => {
        let content = req.body;
        if (typeof content === 'object' && content?.content) {
            content = content.content;
        }
        if (typeof content !== 'string') {
            reply.status(400);
            return { success: false, error: 'Expected string content for server.properties' };
        }
        configService.saveRaw(content);
        return { success: true, config: configService.parse() };
    });
}
