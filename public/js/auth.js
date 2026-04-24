'use strict';

/**
 * Client-side auth helpers: token storage, user decoding, logout.
 * Exposed as `window.pdrs.auth`.
 */
(function () {
  const TOKEN_KEY = 'pdrs.token';
  const USER_KEY = 'pdrs.user';

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_err) { return null; }
  }
  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_err) { /* ignore */ }
  }
  function safeRemove(key) {
    try { window.localStorage.removeItem(key); } catch (_err) { /* ignore */ }
  }

  function getToken() {
    return safeGet(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) safeSet(TOKEN_KEY, token);
    else safeRemove(TOKEN_KEY);
  }

  function getUser() {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_err) { return null; }
  }

  function setUser(user) {
    if (user) safeSet(USER_KEY, JSON.stringify(user));
    else safeRemove(USER_KEY);
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function logout(redirectTo) {
    setToken(null);
    setUser(null);
    if (redirectTo) window.location.href = redirectTo;
  }

  /**
   * Page guard: if no token is present, redirect to the login page exactly
   * once. Safe to call from any page on load.
   *
   * Defensive guards (belt-and-braces against any future redirect loop):
   *   - The module-level `__authChecked` flag means a second call inside
   *     the same page load is a no-op.
   *   - We never redirect if we are already on a public page
   *     (login / register / index / "/") so an unauthenticated visitor
   *     can never bounce off the login screen back to itself.
   *
   * @param {string} [loginUrl='/login.html']
   * @returns {boolean} true if a token is present, false otherwise
   */
  function requireAuth(loginUrl) {
    if (window.__authChecked) return Boolean(getToken());
    window.__authChecked = true;

    if (getToken()) return true;

    const target = loginUrl || '/login.html';
    const here = (window.location.pathname || '/').toLowerCase();
    const PUBLIC_PATHS = ['/', '/index.html', '/login.html', '/register.html'];
    const targetPath = target.split('?')[0].split('#')[0].toLowerCase();

    // Never redirect if we are already on a public page or already on the
    // exact login target — that's the classic infinite-reload trigger.
    if (PUBLIC_PATHS.indexOf(here) !== -1 || here === targetPath) {
      return false;
    }

    window.location.href = target;
    return false;
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.auth = {
    TOKEN_KEY,
    USER_KEY,
    getToken,
    setToken,
    getUser,
    setUser,
    isAuthenticated,
    logout,
    requireAuth,
  };
})();
