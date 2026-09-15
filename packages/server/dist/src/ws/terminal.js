export function registerWebSocketTerminal(fastify, supervisor) {
    // Register WebSocket route for interactive BDS console
    fastify.get('/ws/console', { websocket: true }, (socket) => {
        // Send initial snapshot
        socket.send(JSON.stringify({
            type: 'init',
            state: supervisor.getState(),
            logs: supervisor.getLogs(),
            metrics: supervisor.getMetrics(),
        }));
        // Stream live logs to this client
        const onLog = (line) => {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: 'log', data: line }));
            }
        };
        // Stream state transitions (offline -> starting -> online -> stopping)
        const onState = (state) => {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: 'state', data: state }));
            }
        };
        supervisor.on('log', onLog);
        supervisor.on('state', onState);
        // Handle incoming commands from xterm.js / browser
        socket.on('message', (raw) => {
            try {
                const text = raw.toString('utf-8');
                // Could be JSON or plain string
                let command = text;
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.type === 'command' && typeof parsed.command === 'string') {
                        command = parsed.command;
                    }
                }
                catch {
                    // not JSON, treat raw text as command
                }
                if (command.trim()) {
                    supervisor.sendCommand(command);
                }
            }
            catch (err) {
                socket.send(JSON.stringify({ type: 'error', message: err.message }));
            }
        });
        socket.on('close', () => {
            supervisor.off('log', onLog);
            supervisor.off('state', onState);
        });
        socket.on('error', () => {
            supervisor.off('log', onLog);
            supervisor.off('state', onState);
        });
    });
}
