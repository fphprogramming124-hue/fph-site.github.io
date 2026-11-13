/* ==========================================================================
   to-top.js — the floating "back to top" button
   --------------------------------------------------------------------------
   The button is a plain <a href="#home"> in index.html, so Nav's smooth
   scroll (and its focus handling) does the actual jump. This module only:

     - shows it once the reader is a screen past the hero
     - fills the ring around it with how far down the page they are,
       through one custom property, --page-progress (0..1)

   One passive scroll listener, coalesced to a frame.

   Public API:  ToTop.init()
   Global:      window.ToTop
   ========================================================================== */

window.ToTop = (function () {
  'use strict';

  function init() {
    var btn = document.querySelector('[data-to-top]');
    if (!btn) return;

    var queued = false;

    function frame() {
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY || window.pageYOffset || 0;
      btn.classList.toggle('is-visible', y > window.innerHeight * 0.9);
      btn.style.setProperty('--page-progress', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
  }

  return { init: init };
})();
