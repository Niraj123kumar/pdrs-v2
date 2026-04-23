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
  };
})();
