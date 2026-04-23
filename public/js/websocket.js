'use strict';

/**
 * Thin WebSocket client wrapper with auto-reconnect.
 * Exposed as `window.pdrs.ws`.
 *
 * Usage:
 *   const client = window.pdrs.ws.connect();
 *   client.on('message', (payload) => { ... });
 *   client.send({ type: 'ping' });
 */
(function () {
  function connect(options) {
    const opts = options || {};
    const path = opts.path || '/ws';
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = opts.url || (scheme + '://' + window.location.host + path);

    const listeners = { open: [], close: [], error: [], message: [] };
    let ws = null;
    let manuallyClosed = false;
    let backoffMs = 500;
    const MAX_BACKOFF = 15000;

    function emit(event, payload) {
      (listeners[event] || []).slice().forEach((fn) => {
        try { fn(payload); } catch (err) { console.error('[pdrs.ws] listener error', err); }
      });
    }

    function open() {
      ws = new WebSocket(url);
      ws.addEventListener('open', () => {
        backoffMs = 500;
        emit('open');
      });
      ws.addEventListener('close', (ev) => {
        emit('close', ev);
        if (manuallyClosed) return;
        const delay = backoffMs;
        backoffMs = Math.min(MAX_BACKOFF, Math.floor(backoffMs * 1.8));
        window.setTimeout(open, delay);
      });
      ws.addEventListener('error', (ev) => emit('error', ev));
      ws.addEventListener('message', (ev) => {
        let payload = ev.data;
        try { payload = JSON.parse(ev.data); } catch (_err) { /* keep raw */ }
        emit('message', payload);
      });
    }

    function send(data) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(body);
      return true;
    }

    function on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    }

    function close() {
      manuallyClosed = true;
      if (ws) ws.close();
    }

    open();
    return { on, send, close, get readyState() { return ws ? ws.readyState : 3; } };
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.ws = { connect };
})();
