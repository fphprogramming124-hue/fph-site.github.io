/* ==========================================================================
   cursor.js — the custom cursor
   --------------------------------------------------------------------------
   A red dot that tracks the pointer exactly and a ring that trails it. Over
   links and buttons the ring grows and inverts what it covers; over an
   element with data-cursor="Label" it grows further and shows the label.

   Only for fine pointers with motion allowed. html.has-cursor hides the
   native cursor (components.css brings it back over text fields); the
   elements stay invisible (html.cursor-on) until the first pointermove,
   and hide again when the pointer leaves the window.

   Public API:  Cursor.init()
   Global:      window.Cursor
   ========================================================================== */

window.Cursor = (function () {
  'use strict';

  var HOVER = 'a, button, [role="button"], label, summary, [data-tilt]';
  var EASE = 0.2;   /* how far the ring closes the gap each frame */

  function init() {
    if (!window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.Motion && window.Motion.prefersReduced()) return;

    var root = document.documentElement;
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    var label = document.createElement('span');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    label.className = 'cursor-ring__label';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    ring.appendChild(label);
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    root.classList.add('has-cursor');

    var x = -100, y = -100, rx = -100, ry = -100;
    var running = false;

    function loop() {
      rx += (x - rx) * EASE;
      ry += (y - ry) * EASE;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) {
        window.requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      root.classList.add('cursor-on');
      if (!running) {
        running = true;
        window.requestAnimationFrame(loop);
      }
    }, { passive: true });

    document.addEventListener('pointerover', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      var labelled = t.closest('[data-cursor]');
      var text = labelled ? labelled.getAttribute('data-cursor') : '';
      var hover = !!t.closest(HOVER);
      label.textContent = text;
      ring.classList.toggle('is-label', !!text);
      ring.classList.toggle('is-hover', hover && !text);
      dot.classList.toggle('is-hover', hover || !!text);
    });

    document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    document.documentElement.addEventListener('pointerleave', function () { root.classList.remove('cursor-on'); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) root.classList.remove('cursor-on');
    });
  }

  return { init: init };
})();
