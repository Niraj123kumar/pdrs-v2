'use strict';

(function () {
  const TOKEN_KEY = 'pdrs.token';
  const USER_KEY = 'pdrs.user';

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_err) { return null; }
  }
  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_err) { }
  }
  function safeRemove(key) {
    try { window.localStorage.removeItem(key); } catch (_err) { }
  }

  function saveToken(token, user) {
    if (token) safeSet(TOKEN_KEY, token);
    else safeRemove(TOKEN_KEY);
    if (user) safeSet(USER_KEY, JSON.stringify(user));
    else safeRemove(USER_KEY);
  }

  function getToken() { return safeGet(TOKEN_KEY); }

  function getUser() {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_err) { return null; }
  }

  function logout(redirectTo) {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
    window.location.href = redirectTo || '/login.html';
  }

  function requireAuth(loginUrl) {
    if (window.__authChecked) return Boolean(getToken());
    window.__authChecked = true;
    if (getToken()) return true;
    const target = loginUrl || '/login.html';
    const here = (window.location.pathname || '/').toLowerCase();
    const PUBLIC_PATHS = ['/', '/index.html', '/login.html', '/register.html'];
    const targetPath = target.split('?')[0].split('#')[0].toLowerCase();
    if (PUBLIC_PATHS.indexOf(here) !== -1 || here === targetPath) return false;
    window.location.href = target;
    return false;
  }

  function dashboardFor(role) {
    if (role === 'faculty') return '/faculty.html';
    return '/student.html';
  }

  function requireRole(role) {
    if (!requireAuth()) return false;
    const user = getUser();
    if (!user || user.role !== role) {
      window.location.href = dashboardFor(user && user.role);
      return false;
    }
    return true;
  }

  function isAuthenticated() { return Boolean(getToken()); }

  window.pdrs = window.pdrs || {};
  window.pdrs.auth = {
    TOKEN_KEY, USER_KEY,
    saveToken, getToken, getUser,
    logout, requireAuth, requireRole,
    isAuthenticated, dashboardFor,
    setToken: (t) => safeSet(TOKEN_KEY, t),
    setUser: (u) => (u ? safeSet(USER_KEY, JSON.stringify(u)) : safeRemove(USER_KEY)),
  };
})();
