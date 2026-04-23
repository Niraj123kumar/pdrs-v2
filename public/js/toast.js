'use strict';

/**
 * Toast notifications. Expects an element with id `toast-host` on the page
 * (see styles.css .toast-host). Exposed as `window.pdrs.toast`.
 */
(function () {
  function ensureHost() {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }

  function show(message, variant, durationMs) {
    const host = ensureHost();
    const el = document.createElement('div');
    el.className = 'toast toast--' + (variant || 'info') + ' anim-slide-in';
    el.textContent = String(message == null ? '' : message);
    host.appendChild(el);

    const ttl = Number(durationMs) || 3200;
    const remove = () => {
      if (!el.parentNode) return;
      el.style.transition = 'opacity 160ms ease';
      el.style.opacity = '0';
      window.setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 180);
    };
    window.setTimeout(remove, ttl);
    return el;
  }

  const toast = {
    show,
    info: (msg, ms) => show(msg, 'info', ms),
    ok: (msg, ms) => show(msg, 'ok', ms),
    warn: (msg, ms) => show(msg, 'warn', ms),
    err: (msg, ms) => show(msg, 'err', ms),
  };

  window.pdrs = window.pdrs || {};
  window.pdrs.toast = toast;
})();
