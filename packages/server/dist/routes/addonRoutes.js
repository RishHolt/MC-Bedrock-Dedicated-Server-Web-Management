export async function registerAddonRoutes(fastify, addonService) {
    // Get all installed packs
    fastify.get('/api/addons', async (_req, reply) => {
        try {
            const packs = addonService.getPacks();
            return reply.send({ success: true, data: packs });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Toggle pack activation in current active world
    fastify.post('/api/addons/toggle', async (req, reply) => {
        try {
            const body = req.body;
            if (!body || !body.uuid || !body.type || typeof body.enabled !== 'boolean') {
                return reply.status(400).send({ success: false, error: 'uuid, type, and enabled flag are required' });
            }
            const success = addonService.togglePack(body.uuid, body.type, body.enabled);
            return reply.send({ success });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Delete an installed pack
    fastify.delete('/api/addons/:uuid', async (req, reply) => {
        try {
            const { uuid } = req.params;
            if (!uuid) {
                return reply.status(400).send({ success: false, error: 'uuid parameter required' });
            }
            const deleted = addonService.deletePack(uuid);
            return reply.send({ success: deleted });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
    // Upload and install .mcpack / .mcaddon / .zip archive
    fastify.post('/api/addons/upload', async (req, reply) => {
        try {
            let fileName = 'upload.mcpack';
            let buffer = null;
            // Check if multipart form data was sent
            if (req.isMultipart && req.isMultipart()) {
                const filePart = await req.file();
                if (filePart) {
                    fileName = filePart.filename;
                    buffer = await filePart.toBuffer();
                }
            }
            // Check for JSON base64 fallback
            if (!buffer && req.body) {
                const body = req.body;
                if (body.fileBase64) {
                    fileName = body.fileName || 'upload.mcpack';
                    buffer = Buffer.from(body.fileBase64, 'base64');
                }
            }
            if (!buffer || buffer.length === 0) {
                return reply.status(400).send({ success: false, error: 'No valid file uploaded or base64 payload provided' });
            }
            const installedPacks = await addonService.installPackFromBuffer(fileName, buffer);
            return reply.send({ success: true, count: installedPacks.length, data: installedPacks });
        }
        catch (err) {
            return reply.status(500).send({ success: false, error: err.message });
        }
    });
}
