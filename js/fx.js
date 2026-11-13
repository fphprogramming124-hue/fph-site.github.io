/* ==========================================================================
   fx.js — pointer effects: spotlight, 3D tilt, magnetic buttons
   --------------------------------------------------------------------------
     [data-spotlight]  a soft red glow follows the pointer (the ::after
                       gradient in components.css reads --mx / --my)
     [data-tilt]       the card leans toward the pointer in 3D. Written to
                       the `rotate` property, so it never fights a reveal's
                       `transform`. The parent supplies `perspective`.
     [data-magnetic]   buttons drift a few px toward the pointer (--mag-x /
                       --mag-y, applied as `translate`)

   One delegated pointermove listener for the whole page, coalesced to a
   frame, and only for fine pointers — touch has no hover to follow. Works
   for cards render.js injects later, since nothing is bound per element.
   The spotlight is a colour change, so it stays on under reduced motion;
   tilt and magnetic movement are switched off there.

   Public API:  FX.init()
   Global:      window.FX
   ========================================================================== */

window.FX = (function () {
  'use strict';

  var TILT_MAX = 7;      /* degrees */
  var MAG_PULL = 0.28;   /* share of the pointer's offset from centre */
  var MAG_MAX = 10;      /* px */

  function reduced() {
    return window.Motion ? window.Motion.prefersReduced() : false;
  }

  function init() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var x = 0;
    var y = 0;
    var target = null;
    var queued = false;
    var spot = null;
    var tilt = null;
    var mag = null;

    function release(el, kind) {
      if (!el) return;
      if (kind === 'tilt') {
        el.classList.remove('is-tilting');
        el.style.rotate = '';
      } else {
        el.style.removeProperty('--mag-x');
        el.style.removeProperty('--mag-y');
      }
    }

    function frame() {
      queued = false;
      var motion = !reduced();

      var nextSpot = target && target.closest('[data-spotlight]');
      var nextTilt = motion && target ? target.closest('[data-tilt]') : null;
      var nextMag  = motion && target ? target.closest('[data-magnetic]') : null;

      if (tilt && tilt !== nextTilt) release(tilt, 'tilt');
      if (mag && mag !== nextMag) release(mag, 'mag');
      spot = nextSpot; tilt = nextTilt; mag = nextMag;

      if (spot) {
        var s = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', (x - s.left) + 'px');
        spot.style.setProperty('--my', (y - s.top) + 'px');
      }

      if (tilt) {
        var t = tilt.getBoundingClientRect();
        /* -1…1 from the card's centre */
        var nx = ((x - t.left) / t.width) * 2 - 1;
        var ny = ((y - t.top) / t.height) * 2 - 1;
        var angle = Math.min(1, Math.sqrt(nx * nx + ny * ny)) * TILT_MAX;
        /* Axis perpendicular to the pointer direction: the near edge dips */
        tilt.classList.add('is-tilting');
        tilt.style.rotate = (-ny).toFixed(3) + ' ' + nx.toFixed(3) + ' 0 ' + angle.toFixed(2) + 'deg';
      }

      if (mag) {
        var m = mag.getBoundingClientRect();
        var dx = (x - (m.left + m.width / 2)) * MAG_PULL;
        var dy = (y - (m.top + m.height / 2)) * MAG_PULL;
        mag.style.setProperty('--mag-x', Math.max(-MAG_MAX, Math.min(MAG_MAX, dx)).toFixed(1) + 'px');
        mag.style.setProperty('--mag-y', Math.max(-MAG_MAX, Math.min(MAG_MAX, dy)).toFixed(1) + 'px');
      }
    }

    document.addEventListener('pointermove', function (e) {
      target = e.target && e.target.closest ? e.target : null;
      x = e.clientX;
      y = e.clientY;
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(frame);
      }
    }, { passive: true });

    /* Leaving the window must not leave a card frozen mid-lean */
    document.addEventListener('pointerleave', function () {
      release(tilt, 'tilt');
      release(mag, 'mag');
      tilt = mag = target = null;
    });
  }

  return { init: init };
})();
