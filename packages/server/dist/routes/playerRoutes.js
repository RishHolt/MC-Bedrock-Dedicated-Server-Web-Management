export async function registerPlayerRoutes(fastify, playerService) {
    // Get all allowlisted players with permissions and status
    fastify.get('/api/players/allowlist', async (_req, reply) => {
        try {
            const players = playerService.getAllowlist();
            return reply.send({ success: true, data: players });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Add or update player in allowlist & permissions
    fastify.post('/api/players/allowlist', async (req, reply) => {
        try {
            const body = req.body;
            if (!body || !body.name || !body.xuid) {
                return reply.status(400).send({ success: false, error: 'Gamertag and XUID are required' });
            }
            const player = await playerService.addOrUpdatePlayer({
                name: body.name.trim(),
                xuid: body.xuid.trim(),
                role: body.role || 'member',
                ignoresPlayerLimit: Boolean(body.ignoresPlayerLimit),
            });
            return reply.send({ success: true, data: player });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Remove player from allowlist
    fastify.delete('/api/players/allowlist/:xuid', async (req, reply) => {
        try {
            const { xuid } = req.params;
            const removed = await playerService.removePlayer(xuid);
            return reply.send({ success: removed });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Update player role
    fastify.post('/api/players/role', async (req, reply) => {
        try {
            const body = req.body;
            if (!body || !body.xuid || !body.role) {
                return reply.status(400).send({ success: false, error: 'XUID and role are required' });
            }
            const success = await playerService.setRole(body.xuid, body.role);
            return reply.send({ success });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Get currently connected online players
    fastify.get('/api/players/online', async (_req, reply) => {
        try {
            const players = playerService.getOnlinePlayers();
            return reply.send({ success: true, data: players });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Kick a player
    fastify.post('/api/players/kick', async (req, reply) => {
        try {
            const body = req.body;
            if (!body || !body.name) {
                return reply.status(400).send({ success: false, error: 'Player name is required' });
            }
            const kicked = playerService.kickPlayer(body.name, body.reason);
            return reply.send({ success: kicked });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Resolve Xbox Gamertag to XUID
    fastify.get('/api/players/lookup', async (req, reply) => {
        try {
            const query = req.query;
            if (!query.gamertag) {
                return reply.status(400).send({ success: false, error: 'gamertag query parameter is required' });
            }
            const result = await playerService.lookupXuid(query.gamertag);
            return reply.send({ success: true, ...result });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
}
