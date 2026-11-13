/* ==========================================================================
   rail.js — scroll-velocity marquee
   --------------------------------------------------------------------------
   A continuously drifting strip whose speed is the sum of a slow idle drift
   and the reader's current scroll velocity. Scrolling fast pushes it along;
   stopping lets it ease back to the idle rate. It gives a static band a sense
   of being driven by the page rather than looping on a timer.

   Markup contract:

     <div class="rail" data-rail>                    (or data-rail="right")
       <div class="rail__track" data-rail-track>
         <ul class="rail__group">…items…</ul>
       </div>
     </div>

   The group is cloned until the track is at least twice the container width,
   so there is always a full copy queued off the right edge. Clones are marked
   aria-hidden — the content is announced once, not four times.

   REDUCED MOTION
   The loop never starts, and no clones are made: the band renders as a plain
   static row. This is a JS-driven transform, so the universal !important
   override in animations.css cannot reach it — it has to be handled here.

   Public API:
     Rail.init()   call once, after Motion.init()
   ========================================================================== */

window.Rail = (function () {
  'use strict';

  /* px per frame at 60fps. Deliberately slow — this is a texture, not a
     feature competing with the content next to it. */
  var IDLE_VELOCITY = 0.55;

  /* How much of the frame's scroll delta feeds into the rail. */
  var SCROLL_INFLUENCE = 0.22;

  /* How fast the borrowed scroll velocity decays back to idle. Lower is
     longer-tailed; this lands at roughly a third of a second. */
  var DECAY = 0.075;

  /* Hard cap so a flick or a jump-to-anchor cannot fling the strip. */
  var MAX_BORROWED = 14;

  var rails = [];
  var running = false;
  var lastScrollY = 0;
  var scrollVelocity = 0;

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  function prefersReduced() {
    return !!(window.Motion && window.Motion.prefersReduced());
  }

  /* --------------------------------------------------------------------
     One rail
     -------------------------------------------------------------------- */

  function Rail(el) {
    this.el = el;
    this.track = el.querySelector('[data-rail-track]');
    this.group = this.track && this.track.firstElementChild;
    this.direction = el.getAttribute('data-rail') === 'right' ? 1 : -1;
    this.offset = 0;
    this.copyWidth = 0;
    this.onScreen = true;
  }

  /* The group carries its own trailing gap (padding-inline-end in the CSS), so
     its border box is exactly one repeat unit — no separate gap arithmetic. */
  Rail.prototype.measure = function () {
    if (!this.group) return;
    this.copyWidth = this.group.getBoundingClientRect().width;
  };

  Rail.prototype.fill = function () {
    if (!this.track || !this.group) return;

    /* Drop any previous clones before re-filling on resize. */
    while (this.track.children.length > 1) {
      this.track.removeChild(this.track.lastElementChild);
    }

    this.measure();
    if (!this.copyWidth) return;

    var needed = Math.ceil((this.el.offsetWidth * 2) / this.copyWidth);
    for (var i = 0; i < needed; i++) {
      var clone = this.group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      this.track.appendChild(clone);
    }
  };

  Rail.prototype.step = function (borrowed) {
    if (!this.copyWidth || !this.onScreen) return;

    this.offset += (IDLE_VELOCITY + borrowed) * this.direction;

    /* Wrap into [-copyWidth, 0) so the transform never grows without bound
       and the seam always lands on a copy boundary. */
    this.offset = this.offset % this.copyWidth;
    if (this.offset > 0) this.offset -= this.copyWidth;

    this.track.style.transform = 'translate3d(' + this.offset + 'px, 0, 0)';
  };

  /* --------------------------------------------------------------------
     Shared loop — one rAF for every rail on the page
     -------------------------------------------------------------------- */

  function frame() {
    if (!running) return;

    var borrowed = Math.min(Math.abs(scrollVelocity) * SCROLL_INFLUENCE, MAX_BORROWED);

    for (var i = 0; i < rails.length; i++) {
      rails[i].step(borrowed);
    }

    scrollVelocity += (0 - scrollVelocity) * DECAY;
    if (Math.abs(scrollVelocity) < 0.01) scrollVelocity = 0;

    window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastScrollY = window.pageYOffset;
    window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  function onScroll() {
    var y = window.pageYOffset;
    scrollVelocity = y - lastScrollY;
    lastScrollY = y;
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    var nodes = toArray(document.querySelectorAll('[data-rail]'));
    if (!nodes.length) return;

    /* Reduced motion: leave the single un-cloned group in place and never
       start the loop. The band still reads as a row of capabilities. */
    if (prefersReduced()) return;

    rails = nodes.map(function (el) {
      var rail = new Rail(el);
      rail.fill();
      return rail;
    }).filter(function (rail) { return rail.copyWidth > 0; });

    if (!rails.length) return;

    /* Only animate what is on screen — a rail scrolled past has no reason to
       keep the compositor busy for the rest of a page this long. */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          for (var i = 0; i < rails.length; i++) {
            if (rails[i].el === entry.target) rails[i].onScreen = entry.isIntersecting;
          }
        });
      }, { rootMargin: '100px 0px' });

      rails.forEach(function (rail) { io.observe(rail.el); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* A background tab still fires rAF in some engines; nothing to gain. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        rails.forEach(function (rail) {
          rail.offset = 0;
          rail.track.style.transform = '';
          rail.fill();
        });
      }, 200);
    });

    start();
  }

  return {
    init: init
  };
})();
