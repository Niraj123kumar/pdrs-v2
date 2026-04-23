'use strict';

const { WebSocketServer } = require('ws');

/**
 * Attach a WebSocketServer to an existing HTTP server at the `/ws` path.
 * Phase 1 only establishes the connection plumbing — feature-specific message
 * handlers (panel chat, live annotations, etc.) land in later phases.
 */
function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (!url || !url.startsWith('/ws')) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      // Echo a simple ack so clients can verify the channel is open. Feature
      // handlers are added in later phases.
      let payload;
      try {
        payload = JSON.parse(data.toString());
      } catch (_err) {
        payload = { raw: data.toString() };
      }
      ws.send(JSON.stringify({ type: 'ack', received: payload }));
    });

    ws.send(JSON.stringify({ type: 'hello', service: 'pdrs', version: '0.1.0' }));
  });

  // Heartbeat to drop dead clients.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (_err) {
        ws.terminate();
      }
    }
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { attachWebSocketServer };
