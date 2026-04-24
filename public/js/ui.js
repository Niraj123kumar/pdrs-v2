'use strict';

/**
 * Reusable UI helpers shared by every page.
 * Exposed as `window.pdrs.ui`.
 *
 * Pure UI / DOM helpers only — does not call any API or change behavior.
 */
(function () {
  const EMPTY_ICONS = {
    sessions: '🎯',
    history: '🗂️',
    notifications: '🔔',
    requests: '📥',
    panels: '🎙️',
    projects: '📁',
    generic: '✨',
  };

  // ---------- button loading state -----------------------------------------
  function setLoading(btn, isLoading, loadingText) {
    if (!btn) return;
    if (isLoading) {
      if (btn.dataset.origText === undefined) {
        btn.dataset.origText = btn.innerHTML;
      }
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML =
        '<span class="spinner" aria-hidden="true"></span> ' +
        (loadingText || 'Working…');
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.origText !== undefined) {
        btn.innerHTML = btn.dataset.origText;
        delete btn.dataset.origText;
      }
    }
  }

  // ---------- password show / hide -----------------------------------------
  function attachPasswordToggle(input) {
    if (!input || input.dataset.pwToggleAttached === '1') return;
    input.dataset.pwToggleAttached = '1';

    const wrap = document.createElement('div');
    wrap.className = 'input-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'input-wrap__toggle';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = '👁';
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      btn.setAttribute('aria-pressed', String(!showing));
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      input.focus();
    });
    wrap.appendChild(btn);
  }

  function attachAllPasswordToggles(root) {
    const scope = root || document;
    scope
      .querySelectorAll('input[type="password"]')
      .forEach((el) => attachPasswordToggle(el));
  }

  // ---------- character counter --------------------------------------------
  function attachCharCounter(textarea, max) {
    if (!textarea || textarea.dataset.counterAttached === '1') return;
    textarea.dataset.counterAttached = '1';

    const limit = Number(max) || Number(textarea.getAttribute('maxlength')) || 1000;
    if (!textarea.getAttribute('maxlength')) textarea.setAttribute('maxlength', String(limit));

    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.setAttribute('aria-live', 'polite');
    textarea.parentNode.appendChild(counter);

    const update = () => {
      const len = textarea.value.length;
      counter.textContent = len + ' / ' + limit + ' characters';
      counter.classList.toggle('char-counter--warn', len >= limit * 0.8 && len < limit * 0.95);
      counter.classList.toggle('char-counter--err', len >= limit * 0.95);
    };
    textarea.addEventListener('input', update);
    update();
  }

  function attachAllCharCounters(root) {
    const scope = root || document;
    scope.querySelectorAll('textarea[data-counter], textarea[maxlength]').forEach((el) => {
      attachCharCounter(el);
    });
  }

  // ---------- form validation ----------------------------------------------
  // Mark a single field as invalid/valid with an inline message.
  function setFieldError(input, message) {
    if (!input) return;
    const row = input.closest('.form__row') || input.parentNode;
    let err = row.querySelector('.form__error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'form__error';
      err.setAttribute('aria-live', 'polite');
      row.appendChild(err);
    }
    if (message) {
      err.textContent = message;
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      err.textContent = '';
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      input.removeAttribute('aria-invalid');
    }
  }

  function clearFieldError(input) {
    if (!input) return;
    const row = input.closest('.form__row') || input.parentNode;
    const err = row.querySelector('.form__error');
    if (err) err.textContent = '';
    input.classList.remove('is-invalid');
  }

  // Wire built-in browser validity to our visual styling. Clears on input.
  function attachLiveValidation(form) {
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('blur', () => {
        if (!field.value && !field.required) return;
        if (field.checkValidity()) setFieldError(field, '');
        else setFieldError(field, field.validationMessage || 'Please check this field.');
      });
      field.addEventListener('input', () => clearFieldError(field));
    });
    form.addEventListener('submit', (e) => {
      let firstInvalid = null;
      form.querySelectorAll('input, textarea, select').forEach((field) => {
        if (!field.checkValidity()) {
          setFieldError(field, field.validationMessage || 'Please check this field.');
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.focus();
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 450);
      }
    });
  }

  // ---------- modal / confirmation ----------------------------------------
  function confirmModal(opts) {
    const o = Object.assign(
      {
        title: 'Are you sure?',
        message: 'This cannot be undone.',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        danger: true,
      },
      opts || {}
    );

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'pdrs-modal-title');
      overlay.innerHTML =
        '<div class="modal anim-pop">' +
        '  <button type="button" class="modal__close" aria-label="Close">×</button>' +
        '  <h3 id="pdrs-modal-title" class="modal__title"></h3>' +
        '  <p class="modal__msg"></p>' +
        '  <div class="modal__actions">' +
        '    <button type="button" class="btn btn--ghost" data-act="cancel"></button>' +
        '    <button type="button" class="btn" data-act="confirm"></button>' +
        '  </div>' +
        '</div>';

      overlay.querySelector('.modal__title').textContent = o.title;
      overlay.querySelector('.modal__msg').textContent = o.message;
      const cancelBtn = overlay.querySelector('[data-act="cancel"]');
      const confirmBtn = overlay.querySelector('[data-act="confirm"]');
      cancelBtn.textContent = o.cancelText;
      confirmBtn.textContent = o.confirmText;
      if (o.danger) confirmBtn.classList.add('btn--danger');
      else confirmBtn.classList.add('btn--primary');

      const lastFocus = document.activeElement;
      const close = (result) => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        resolve(result);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
        if (e.key === 'Tab') {
          // Trap focus inside the modal.
          const focusables = overlay.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
      overlay.querySelector('.modal__close').addEventListener('click', () => close(false));
      cancelBtn.addEventListener('click', () => close(false));
      confirmBtn.addEventListener('click', () => close(true));
      document.addEventListener('keydown', onKey, true);

      document.body.appendChild(overlay);
      // Focus the safe (cancel) action by default.
      cancelBtn.focus();
    });
  }

  // ---------- password strength meter --------------------------------------
  function passwordStrength(pw) {
    const s = String(pw || '');
    if (!s) return { score: 0, label: '' };
    let score = 0;
    if (s.length >= 8) score++;
    if (s.length >= 12) score++;
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++;
    if (/\d/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;
    const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][score] || 'Strong';
    return { score: Math.min(score, 4), label };
  }

  function attachStrengthMeter(input) {
    if (!input || input.dataset.strengthAttached === '1') return;
    input.dataset.strengthAttached = '1';

    const meter = document.createElement('div');
    meter.className = 'pw-meter';
    meter.innerHTML =
      '<div class="pw-meter__bar"><div class="pw-meter__fill"></div></div>' +
      '<span class="pw-meter__label muted"></span>';
    input.parentNode.appendChild(meter);
    const fill = meter.querySelector('.pw-meter__fill');
    const label = meter.querySelector('.pw-meter__label');
    const update = () => {
      const { score, label: text } = passwordStrength(input.value);
      const pct = (score / 4) * 100;
      fill.style.width = pct + '%';
      fill.dataset.score = String(score);
      label.textContent = input.value ? text : '';
    };
    input.addEventListener('input', update);
    update();
  }

  // ---------- skeleton loaders & empty state -------------------------------
  function skeletonLines(count) {
    const n = Math.max(1, Number(count) || 3);
    const wrap = document.createElement('div');
    wrap.className = 'skeleton-stack';
    for (let i = 0; i < n; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton--line';
      wrap.appendChild(line);
    }
    return wrap;
  }

  function skeletonRows(count, cols) {
    const n = Math.max(1, Number(count) || 3);
    const c = Math.max(1, Number(cols) || 4);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < c; j++) {
        const td = document.createElement('td');
        td.innerHTML = '<div class="skeleton skeleton--cell"></div>';
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    return frag;
  }

  function emptyState(opts) {
    const o = Object.assign(
      {
        icon: EMPTY_ICONS.generic,
        title: 'Nothing here yet',
        message: '',
        ctaText: '',
        ctaHref: '',
        onCta: null,
      },
      opts || {}
    );
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    const html = [
      '<div class="empty-state__icon" aria-hidden="true">' + escapeText(o.icon) + '</div>',
      '<h3 class="empty-state__title">' + escapeText(o.title) + '</h3>',
    ];
    if (o.message) html.push('<p class="empty-state__msg muted">' + escapeText(o.message) + '</p>');
    if (o.ctaText) {
      if (o.ctaHref) {
        html.push(
          '<a class="btn btn--primary empty-state__cta" href="' +
            escapeAttr(o.ctaHref) +
            '">' +
            escapeText(o.ctaText) +
            '</a>'
        );
      } else {
        html.push(
          '<button type="button" class="btn btn--primary empty-state__cta">' +
            escapeText(o.ctaText) +
            '</button>'
        );
      }
    }
    wrap.innerHTML = html.join('');
    if (o.ctaText && !o.ctaHref && typeof o.onCta === 'function') {
      wrap.querySelector('.empty-state__cta').addEventListener('click', o.onCta);
    }
    return wrap;
  }

  function escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeText(s).replace(/"/g, '&quot;');
  }

  // ---------- avatars (initials) -------------------------------------------
  function initialsAvatar(name) {
    const safe = String(name || '?').trim();
    const letter = (safe[0] || '?').toUpperCase();
    const palette = ['#7aa2ff', '#b18cff', '#4ade80', '#fbbf24', '#f87171', '#22d3ee', '#f472b6'];
    let hash = 0;
    for (let i = 0; i < safe.length; i++) hash = (hash * 31 + safe.charCodeAt(i)) >>> 0;
    const color = palette[hash % palette.length];
    const el = document.createElement('span');
    el.className = 'avatar';
    el.style.background = color;
    el.textContent = letter;
    el.setAttribute('aria-label', safe);
    return el;
  }

  // ---------- nav: highlight active page -----------------------------------
  function highlightActiveNav() {
    const here = location.pathname.replace(/\/+$/, '') || '/';
    document.querySelectorAll('.nav__links a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const path = href.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';
      if (path === here || (path !== '/' && here.endsWith(path))) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  // ---------- bootstrap ----------------------------------------------------
  function boot() {
    document.documentElement.style.scrollBehavior = 'smooth';
    highlightActiveNav();
    attachAllPasswordToggles();
    attachAllCharCounters();
    document.querySelectorAll('form[data-validate]').forEach((f) => attachLiveValidation(f));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.ui = {
    setLoading,
    attachPasswordToggle,
    attachAllPasswordToggles,
    attachCharCounter,
    attachAllCharCounters,
    attachLiveValidation,
    setFieldError,
    clearFieldError,
    confirmModal,
    passwordStrength,
    attachStrengthMeter,
    skeletonLines,
    skeletonRows,
    emptyState,
    initialsAvatar,
    highlightActiveNav,
  };
})();
