'use strict';

/**
 * General-purpose DOM and formatting helpers.
 * Exposed as `window.pdrs.utils`.
 */
(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }
  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  function formatNumber(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toFixed(digits === undefined ? 0 : digits);
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.utils = {
    qs,
    qsa,
    escapeHtml,
    formatDate,
    formatNumber,
    debounce,
    getQueryParam,
  };
})();
