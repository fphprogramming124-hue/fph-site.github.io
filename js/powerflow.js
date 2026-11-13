/* ==========================================================================
   powerflow.js — "How power reaches the wheel", the interactive CVT diagram
   --------------------------------------------------------------------------
   Drives the [data-powerflow] block in the Products section: an SVG
   schematic of a scooter's drive line and the step list beside it.

   The markup is complete without this file. Every step's text is in the
   HTML and, until .is-ready lands on the block, every one is shown, so the
   no-JS page reads as a plain numbered explanation. This module only adds:

     - one active step at a time (the step buttons, prev/next, or clicking a
       part of the drawing)
     - the drawing lighting up along the power path as the steps advance —
       parts before the active one are "powered", the active part is lit
     - autoplay while the block is on screen, with a visible pause control
       (WCAG 2.2.2: anything that moves on its own for over 5s needs one)
       that stops for good the moment someone picks a step themselves

   Spinning pulleys and the travelling belt are CSS (sections.css,
   "POWERFLOW"), gated by .is-running, which this module toggles from an
   IntersectionObserver so nothing animates off screen.

   Reduced motion: no autoplay, no spinning, no belt travel. The steps still
   work and the drawing still lights up — that is state, not motion.

   Public API:  PowerFlow.init()
   Global:      window.PowerFlow
   ========================================================================== */

window.PowerFlow = (function () {
  'use strict';

  var INTERVAL = 5200;   /* ms per step; replaced by --dur-tour at init */

  function readInterval() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-tour');
    var n = parseFloat(raw);
    return isNaN(n) ? INTERVAL : n;
  }

  function toArray(n) { return Array.prototype.slice.call(n); }

  function reduced() {
    return !!(window.Motion && window.Motion.prefersReduced());
  }

  function setup(root) {
    var steps   = toArray(root.querySelectorAll('[data-pf-go]'));
    var details = toArray(root.querySelectorAll('[data-pf-detail]'));
    var parts   = toArray(root.querySelectorAll('[data-pf-part]'));
    var toggle  = root.querySelector('[data-pf-toggle]');
    if (!steps.length || steps.length !== details.length) return;

    var current = 0;
    var timer = null;
    var inView = false;
    var stopped = reduced();   /* autoplay off for good once true */
    var held = false;          /* paused while pointer or focus is inside */

    /* Which drawing parts each step lights, from data-pf-parts="0 1" */
    var map = steps.map(function (btn) {
      return (btn.getAttribute('data-pf-parts') || '').split(/\s+/)
        .filter(Boolean).map(Number);
    });

    function show(index) {
      current = (index % steps.length + steps.length) % steps.length;
      var lit = map[current];
      var reach = Math.max.apply(null, lit);

      steps.forEach(function (btn, i) {
        var on = i === current;
        btn.classList.toggle('is-active', on);
        btn.classList.toggle('is-done', i < current);
        btn.setAttribute('aria-pressed', String(on));
      });
      details.forEach(function (d, i) { d.hidden = i !== current; });

      parts.forEach(function (g) {
        var n = Number(g.getAttribute('data-pf-part'));
        g.classList.toggle('is-active', lit.indexOf(n) !== -1);
        g.classList.toggle('is-powered', n <= reach);
      });

      /* Restart the step's countdown bar: drop the class, force a style
         flush, put it back. */
      root.classList.remove('is-ticking');
      void root.offsetWidth;
      if (playing()) root.classList.add('is-ticking');
    }

    function playing() {
      return !stopped && !held && inView;
    }

    function schedule() {
      window.clearTimeout(timer);
      root.classList.toggle('is-ticking', playing());
      if (!playing()) return;
      timer = window.setTimeout(function () {
        show(current + 1);
        schedule();
      }, INTERVAL);
    }

    function syncToggle() {
      if (!toggle) return;
      toggle.hidden = reduced();
      toggle.setAttribute('aria-pressed', String(stopped));
      toggle.querySelector('[data-pf-toggle-label]').textContent =
        stopped ? 'Play tour' : 'Pause tour';
      root.classList.toggle('is-paused', stopped);
    }

    function stopForGood() {
      stopped = true;
      syncToggle();
      schedule();
    }

    steps.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        show(i);
        stopForGood();
      });
    });

    root.addEventListener('click', function (e) {
      var nudge = e.target.closest('[data-pf-step]');
      if (nudge) {
        show(current + (parseInt(nudge.getAttribute('data-pf-step'), 10) || 0));
        stopForGood();
        return;
      }
      /* Clicking a part of the drawing jumps to the first step that lights it */
      var part = e.target.closest('[data-pf-part]');
      if (part) {
        var n = Number(part.getAttribute('data-pf-part'));
        for (var i = 0; i < map.length; i++) {
          if (map[i].indexOf(n) !== -1) { show(i); break; }
        }
        stopForGood();
      }
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        stopped = !stopped;
        syncToggle();
        if (!stopped) show(current + 1);
        schedule();
      });
    }

    /* Hold still while someone is reading or pointing at it */
    root.addEventListener('pointerenter', function () { held = true; schedule(); });
    root.addEventListener('pointerleave', function () { held = false; schedule(); });
    root.addEventListener('focusin',  function () { held = true; schedule(); });
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) { held = false; schedule(); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        root.classList.toggle('is-running', inView && !reduced());
        schedule();
      }, { threshold: 0.35 }).observe(root);
    }

    root.classList.add('is-ready');
    syncToggle();
    show(0);
  }

  function init() {
    INTERVAL = readInterval();
    toArray(document.querySelectorAll('[data-powerflow]')).forEach(setup);
  }

  return { init: init };
})();
