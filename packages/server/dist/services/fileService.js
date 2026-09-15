import fs from 'node:fs';
import path from 'node:path';
export class FileService {
    bdsDir;
    constructor(bdsDir) {
        this.bdsDir = path.resolve(bdsDir);
    }
    resolveSafePath(relPath) {
        const clean = relPath.replace(/^(\/|\\)+/, '');
        const target = path.resolve(this.bdsDir, clean);
        // Security guard: Ensure path never escapes bdsDir
        const rel = path.relative(this.bdsDir, target);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error('Access denied: Path traversal outside server directory is not permitted.');
        }
        return target;
    }
    getSafePath(relPath) {
        return this.resolveSafePath(relPath);
    }
    createDirectory(relPath) {
        const target = this.resolveSafePath(relPath);
        fs.mkdirSync(target, { recursive: true });
    }
    listDirectory(relPath = '/') {
        const targetPath = this.resolveSafePath(relPath);
        if (!fs.existsSync(targetPath)) {
            throw new Error(`Directory not found: ${relPath}`);
        }
        const stat = fs.statSync(targetPath);
        if (!stat.isDirectory()) {
            throw new Error(`Target is not a directory: ${relPath}`);
        }
        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const items = [];
        for (const ent of entries) {
            const full = path.join(targetPath, ent.name);
            const s = fs.statSync(full);
            const ext = ent.isFile() ? path.extname(ent.name).replace('.', '').toLowerCase() : undefined;
            // Relative path formatted with forward slashes
            const itemRelPath = '/' + path.relative(this.bdsDir, full).replace(/\\/g, '/');
            items.push({
                name: ent.name,
                path: itemRelPath,
                type: ent.isDirectory() ? 'directory' : 'file',
                sizeBytes: s.size,
                modifiedAt: s.mtime.toLocaleString(),
                extension: ext,
            });
        }
        // Directories first, then files alphabetically
        return items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }
    readFile(relPath) {
        const targetPath = this.resolveSafePath(relPath);
        if (!fs.existsSync(targetPath)) {
            throw new Error(`File not found: ${relPath}`);
        }
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            throw new Error(`Target is a directory, not a file: ${relPath}`);
        }
        return fs.readFileSync(targetPath, 'utf-8');
    }
    writeFile(relPath, content) {
        const targetPath = this.resolveSafePath(relPath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content, 'utf-8');
    }
    deleteItem(relPath) {
        const targetPath = this.resolveSafePath(relPath);
        if (!fs.existsSync(targetPath)) {
            return false;
        }
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        else {
            fs.unlinkSync(targetPath);
        }
        return true;
    }
}
