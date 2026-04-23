'use strict';

/**
 * Thin fetch wrapper that:
 *  - sends/receives JSON by default
 *  - attaches the Authorization header when a JWT is stored
 *  - throws an Error with a useful message on non-2xx responses
 *
 * Exposed as `window.pdrs.api`.
 */
(function () {
  const TOKEN_KEY = 'pdrs.token';

  function getToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEY) || null;
    } catch (_err) {
      return null;
    }
  }

  function buildHeaders(extra) {
    const headers = { Accept: 'application/json', ...(extra || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  async function request(method, url, body, options) {
    const opts = options || {};
    const init = {
      method,
      headers: buildHeaders(opts.headers),
      credentials: 'same-origin',
    };
    if (body !== undefined && body !== null) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_err) { data = text; }
    }
    if (!res.ok) {
      const message = (data && data.error) || res.statusText || 'request_failed';
      const err = new Error(message);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  const api = {
    get: (url, options) => request('GET', url, null, options),
    post: (url, body, options) => request('POST', url, body, options),
    put: (url, body, options) => request('PUT', url, body, options),
    patch: (url, body, options) => request('PATCH', url, body, options),
    del: (url, options) => request('DELETE', url, null, options),
  };

  window.pdrs = window.pdrs || {};
  window.pdrs.api = api;
})();
