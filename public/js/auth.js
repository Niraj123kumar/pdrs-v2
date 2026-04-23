'use strict';

/**
 * Client-side auth helpers: token + user storage, route guards, logout.
 * Exposed as `window.pdrs.auth` with every function also hung on that
 * namespace for direct use (e.g. `pdrs.auth.requireAuth()`).
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

  /** Persist token + user to localStorage. */
  function saveToken(token, user) {
    if (token) safeSet(TOKEN_KEY, token);
    else safeRemove(TOKEN_KEY);
    if (user) safeSet(USER_KEY, JSON.stringify(user));
    else safeRemove(USER_KEY);
  }

  /** Return the stored JWT or null. */
  function getToken() {
    return safeGet(TOKEN_KEY);
  }

  /** Return the parsed stored user object or null. */
  function getUser() {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_err) { return null; }
  }

  /** Clear stored credentials and redirect to /login.html. */
  function logout() {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
    window.location.href = '/login.html';
  }

  /** If not authenticated, redirect to /login.html. Returns true when ok. */
  function requireAuth() {
    if (!getToken()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }

  /** Pick the canonical dashboard path for a user's role. */
  function dashboardFor(role) {
    if (role === 'faculty') return '/faculty.html';
    return '/student.html';
  }

  /**
   * If the current user's role does not match the expected role, redirect
   * them to their own dashboard. Returns true when role matches.
   */
  function requireRole(role) {
    if (!requireAuth()) return false;
    const user = getUser();
    if (!user || user.role !== role) {
      window.location.href = dashboardFor(user && user.role);
      return false;
    }
    return true;
  }

  /** Convenience: true when a token is stored. */
  function isAuthenticated() {
    return Boolean(getToken());
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.auth = {
    TOKEN_KEY,
    USER_KEY,
    saveToken,
    getToken,
    getUser,
    logout,
    requireAuth,
    requireRole,
    isAuthenticated,
    dashboardFor,
    // Backwards compat with earlier Phase 1 scaffolding:
    setToken: (t) => safeSet(TOKEN_KEY, t),
    setUser: (u) => (u ? safeSet(USER_KEY, JSON.stringify(u)) : safeRemove(USER_KEY)),
  };
})();
