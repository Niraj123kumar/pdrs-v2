'use strict';

/**
 * Lightweight animation helpers that add/remove classes from
 * /css/animations.css. Exposed as `window.pdrs.animations`.
 */
(function () {
  function addClassOnce(el, className, durationMs) {
    if (!el) return;
    el.classList.add(className);
    const ms = Number(durationMs) || 400;
    window.setTimeout(() => el.classList.remove(className), ms);
  }

  function fadeIn(el) { addClassOnce(el, 'anim-fade-in', 200); }
  function slideIn(el) { addClassOnce(el, 'anim-slide-in', 220); }
  function slideUp(el) { addClassOnce(el, 'anim-slide-up', 240); }
  function pop(el) { addClassOnce(el, 'anim-pop', 240); }

  function onReveal(selector) {
    const nodes = document.querySelectorAll(selector);
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('anim-fade-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-fade-in');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    nodes.forEach((n) => io.observe(n));
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.animations = { fadeIn, slideIn, slideUp, pop, onReveal };
})();
