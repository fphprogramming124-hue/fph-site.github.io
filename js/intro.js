/* ==========================================================================
   intro.js — the loader that opens the page
   --------------------------------------------------------------------------
   An inline script in <head> adds html.is-intro on the first visit of a
   browser session when motion is allowed. This module runs the counter
   (000 → 100 over --dur-intro), then lifts the curtain (.is-leaving, a
   clip-path over --dur-intro-out) and removes .is-intro so the hero's own
   entrance plays as the curtain rises.

   The head script also removes .is-intro after 4s whatever happens here,
   so a failure in this file can never leave the page covered.

   Public API:  Intro.init()
   Global:      window.Intro
   ========================================================================== */

window.Intro = (function () {
  'use strict';

  var SEEN_KEY = 'fcc-intro-seen';

  function readMs(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    if (isNaN(n)) return fallback;
    return /ms$/.test(raw) ? n : (/s$/.test(raw) ? n * 1000 : n);
  }

  function init() {
    var root = document.documentElement;
    var el = document.querySelector('[data-intro]');

    if (!el) return;
    if (!root.classList.contains('is-intro')) {
      el.parentNode.removeChild(el);
      return;
    }

    try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}

    var count = el.querySelector('[data-intro-count]');
    var bar = el.querySelector('[data-intro-bar]');
    var runMs = readMs('--dur-intro', 1100);
    var outMs = readMs('--dur-intro-out', 900);
    var start = null;
    var done = false;

    /* Ease-in-out so the counter hesitates at the start and the end — it
       reads like a gauge settling rather than a progress bar. */
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function finish() {
      if (done) return;
      done = true;
      el.classList.add('is-leaving');
      root.classList.remove('is-intro');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, outMs + 100);
    }

    function step(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / runMs, 1);
      var v = ease(t);
      if (count) count.textContent = ('00' + Math.round(v * 100)).slice(-3);
      if (bar) bar.style.transform = 'scaleX(' + v + ')';
      if (t < 1) window.requestAnimationFrame(step);
      else window.setTimeout(finish, 180);
    }

    /* The head script's 4s net may already have cleared the class (a very
       slow first paint); then just get out of the way. */
    if (!root.classList.contains('is-intro')) { finish(); return; }
    window.requestAnimationFrame(step);
  }

  return { init: init };
})();
