import fs from 'node:fs';
import path from 'node:path';
export async function registerFileRoutes(fastify, fileService) {
    // GET /api/files/list?path=/
    fastify.get('/api/files/list', async (req, reply) => {
        const targetPath = req.query?.path || '/';
        try {
            const items = fileService.listDirectory(targetPath);
            return { success: true, path: targetPath, files: items };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // GET /api/files/read?path=/server.properties
    fastify.get('/api/files/read', async (req, reply) => {
        const targetPath = req.query?.path;
        if (!targetPath) {
            reply.status(400);
            return { success: false, error: 'Path query parameter is required' };
        }
        try {
            const content = fileService.readFile(targetPath);
            return { success: true, path: targetPath, content };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // POST /api/files/write
    fastify.post('/api/files/write', async (req, reply) => {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            }
            catch { }
        }
        const filePath = body?.path;
        const content = body?.content;
        if (!filePath || typeof content !== 'string') {
            reply.status(400);
            return { success: false, error: 'Missing path or string content' };
        }
        try {
            fileService.writeFile(filePath, content);
            return { success: true, path: filePath };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // POST /api/files/mkdir
    fastify.post('/api/files/mkdir', async (req, reply) => {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            }
            catch { }
        }
        const dirPath = body?.path;
        if (!dirPath) {
            reply.status(400);
            return { success: false, error: 'Directory path is required' };
        }
        try {
            fileService.createDirectory(dirPath);
            return { success: true, path: dirPath };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // DELETE /api/files (accepts query or body path)
    fastify.delete('/api/files', async (req, reply) => {
        let targetPath = req.query?.path;
        if (!targetPath) {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                }
                catch { }
            }
            targetPath = body?.path;
        }
        if (!targetPath) {
            reply.status(400);
            return { success: false, error: 'Target path is required for deletion' };
        }
        try {
            const deleted = fileService.deleteItem(targetPath);
            return { success: deleted, path: targetPath };
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
    // GET /api/files/download?path=/server.properties
    fastify.get('/api/files/download', async (req, reply) => {
        const targetPath = req.query?.path;
        if (!targetPath) {
            reply.status(400);
            return { success: false, error: 'Path query parameter is required' };
        }
        try {
            const fullPath = fileService.getSafePath(targetPath);
            if (!fs.existsSync(fullPath)) {
                reply.status(404);
                return { success: false, error: 'File not found' };
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                reply.status(400);
                return { success: false, error: 'Cannot download a directory directly. Use snapshots or zip.' };
            }
            const filename = path.basename(fullPath);
            const stream = fs.createReadStream(fullPath);
            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            reply.header('Content-Type', 'application/octet-stream');
            return reply.send(stream);
        }
        catch (err) {
            reply.status(400);
            return { success: false, error: err.message };
        }
    });
}
