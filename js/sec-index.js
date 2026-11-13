/* ==========================================================================
   sec-index.js — the fixed 01–07 section rail on wide screens
   --------------------------------------------------------------------------
   The rail's links carry data-nav-link, so js/nav.js already marks the
   section in view with aria-current. This module only answers one question:
   is the rail currently sitting over an ink section? If so it adds
   .is-on-dark so the rail turns pale (components.css, "Section index").

   Dark grounds opt in with [data-dark-section]. One passive scroll listener,
   coalesced to a frame; does nothing while the rail is display: none.

   Public API:  SecIndex.init()
   Global:      window.SecIndex
   ========================================================================== */

window.SecIndex = (function () {
  'use strict';

  function init() {
    var rail = document.querySelector('[data-sec-index]');
    if (!rail) return;

    var darks = Array.prototype.slice.call(document.querySelectorAll('[data-dark-section]'));
    var queued = false;

    function frame() {
      queued = false;
      if (!rail.offsetParent && getComputedStyle(rail).position !== 'fixed') return;

      var box = rail.getBoundingClientRect();
      var mid = box.top + box.height / 2;
      var onDark = darks.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      rail.classList.toggle('is-on-dark', onDark);
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
