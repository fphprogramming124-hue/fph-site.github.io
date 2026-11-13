/* ==========================================================================
   motion.js — the entire animation system
   --------------------------------------------------------------------------
   Owns: scroll reveal, stagger, line-draw, animated counters, the hero
   entrance sequence, and reduced-motion handling.

   Public API:
     Motion.init()              call once on DOMContentLoaded
     Motion.observe(root)       register newly injected DOM (render.js calls this)
     Motion.prefersReduced()    boolean, live

   Elements opt in with attributes only — never classes — so restyling can
   never break behaviour. See css/animations.css for the matching contract.
   ========================================================================== */

window.Motion = (function () {
  'use strict';

  var REVEAL_SELECTOR = '[data-reveal], [data-draw]';
  var STAGGER_CAP = 8;                 /* long grids must not crawl */
  var OBSERVER_OPTS = {
    threshold: 0.15,
    rootMargin: '0px 0px -12% 0px'     /* fire slightly early: reads responsive */
  };

  var reduceQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: null };

  var revealObserver = null;
  var counterObserver = null;
  var staggerStepMs = 70;              /* read from the token at init */

  /* --------------------------------------------------------------------
     Helpers
     -------------------------------------------------------------------- */

  function prefersReduced() {
    return !!reduceQuery.matches;
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  function readStaggerToken() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--stagger-step')
      .trim();
    var n = parseFloat(raw);
    return isNaN(n) ? 70 : n;
  }

  /* Mark revealed, and release the compositor layer once the transition ends.
     On a page this long, leaving dozens of pinned will-change layers alive
     measurably degrades scroll performance. */
  function markRevealed(el) {
    el.classList.add('is-revealed');

    var cleanup = function () {
      el.style.willChange = '';
      el.removeEventListener('transitionend', cleanup);
    };
    el.addEventListener('transitionend', cleanup);
    /* Fallback in case transitionend never fires (element hidden, etc.).
       Must outlast the slowest reveal: --dur-stage (900ms) plus the largest
       stagger delay. Trip it early and it strips the compositor layer from a
       transition still in flight. */
    window.setTimeout(cleanup, 1400);
  }

  function revealNow(el) {
    el.style.willChange = 'opacity, transform';
    markRevealed(el);
  }

  /* --------------------------------------------------------------------
     Scroll reveal + stagger
     -------------------------------------------------------------------- */

  /* Apply the stagger delay as a CSS custom property so JS never builds a
     style string and CSS keeps full control of the timing. */
  function applyStagger(group) {
    var children = toArray(group.querySelectorAll(REVEAL_SELECTOR))
      .filter(function (child) {
        /* Only direct descendants of THIS group — nested groups own their own */
        return child.closest('[data-reveal-group]') === group;
      });

    children.forEach(function (child, i) {
      var step = Math.min(i, STAGGER_CAP);
      var own = parseInt(child.getAttribute('data-reveal-delay'), 10) || 0;
      child.style.setProperty('--reveal-delay', (step * staggerStepMs + own) + 'ms');
    });
  }

  function handleEntry(entry, observer) {
    if (!entry.isIntersecting) return;
    var el = entry.target;

    if (el.hasAttribute('data-reveal-group')) {
      /* The group is the trigger; its children are what animate. */
      toArray(el.querySelectorAll(REVEAL_SELECTOR)).forEach(revealNow);
      if (el.matches(REVEAL_SELECTOR)) revealNow(el);
    } else {
      revealNow(el);
    }

    if (!el.hasAttribute('data-reveal-repeat')) {
      observer.unobserve(el);
    }
  }

  function observe(root) {
    root = root || document;

    /* Before the reduced-motion bail below: render.js injects card images, and
       those need their load listeners either way. Under reduced motion the CSS
       override keeps them visible, so wiring this up is harmless. */
    initImageFades(root);

    /* No IntersectionObserver (or reduced motion): show everything at once. */
    if (!('IntersectionObserver' in window) || prefersReduced()) {
      toArray(root.querySelectorAll(REVEAL_SELECTOR)).forEach(function (el) {
        el.classList.add('is-revealed');
      });
      toArray(root.querySelectorAll('[data-count-to]')).forEach(setCounterFinal);
      return;
    }

    /* render.js runs before init() so it can inject content in one pass.
       Anything it registers before the observers exist is picked up by the
       observe(document) call at the end of init(). */
    if (!revealObserver || !counterObserver) return;

    /* Stagger groups first, so children carry their delay before revealing. */
    toArray(root.querySelectorAll('[data-reveal-group]')).forEach(function (group) {
      applyStagger(group);
      revealObserver.observe(group);
    });

    /* Standalone reveals — anything not inside a group. */
    toArray(root.querySelectorAll(REVEAL_SELECTOR)).forEach(function (el) {
      if (el.closest('[data-reveal-group]')) return;
      var own = parseInt(el.getAttribute('data-reveal-delay'), 10);
      if (own) el.style.setProperty('--reveal-delay', own + 'ms');
      revealObserver.observe(el);
    });

    /* Counters. The markup carries the FINAL value, so the no-JS page and
       search engines read "512", not "0". Only here, once the counter is
       definitely going to run, is it wound back to its starting value. */
    toArray(root.querySelectorAll('[data-count-to]')).forEach(function (el) {
      if (el.hasAttribute('data-count-done')) return;
      el.textContent = formatCount(parseFloat(el.getAttribute('data-count-from')) || 0, el);
      counterObserver.observe(el);
    });
  }

  /* --------------------------------------------------------------------
     Animated counters
     -------------------------------------------------------------------- */

  function formatCount(value, el) {
    var decimals  = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
    var separator = el.getAttribute('data-count-separator') !== 'false';
    var prefix    = el.getAttribute('data-count-prefix') || '';
    var suffix    = el.getAttribute('data-count-suffix') || '';

    var out = value.toFixed(decimals);

    /* Years (1993) must NOT be grouped as "1,993" — hence the opt-out. */
    if (separator) {
      var parts = out.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      out = parts.join('.');
    }

    return prefix + out + suffix;
  }

  function setCounterFinal(el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;
    el.textContent = formatCount(target, el);
    el.setAttribute('data-count-done', '');
  }

  function runCounter(el) {
    if (el.hasAttribute('data-count-done')) return;
    el.setAttribute('data-count-done', '');

    var target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;

    if (prefersReduced()) {
      el.textContent = formatCount(target, el);
      return;
    }

    var duration = parseInt(el.getAttribute('data-count-duration'), 10) || 1400;
    var from     = parseFloat(el.getAttribute('data-count-from')) || 0;
    var start    = null;

    /* easeOutExpo — fast out of the gate, long settle. Reads "mechanical". */
    function ease(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function step(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      el.textContent = formatCount(from + (target - from) * ease(t), el);
      if (t < 1) window.requestAnimationFrame(step);
      else el.textContent = formatCount(target, el);
    }

    window.requestAnimationFrame(step);
  }

  /* --------------------------------------------------------------------
     Hero entrance — time-based, since the hero is already in view on load.
     Two nested rAF calls are required: the browser must commit the initial
     style before the transition class lands, or nothing animates.
     -------------------------------------------------------------------- */

  function initHero() {
    toArray(document.querySelectorAll('[data-hero-seq]')).forEach(function (el) {
      el.style.setProperty('--seq', el.getAttribute('data-hero-seq') || '0');
    });

    function launch() {
      /* Split before releasing the hero, not after. SplitLines has to measure
         line breaks BEFORE the entrance starts, and adding .is-loaded first
         would leave the title's words already at their final position with
         nothing left to animate. Calling it here rather than letting both
         modules race on document.fonts.ready makes the order explicit.
         split() is idempotent, so SplitLines' own pass is harmless. */
      if (window.SplitLines) {
        try { window.SplitLines.split(document); } catch (err) {}
      }

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          document.documentElement.classList.add('is-loaded');
        });
      });
    }

    /* Hold the entrance until the webfont lands. Source Sans and the Segoe
       fallback have different metrics, so animating across the swap reflows
       the title mid-flight — visible as a jump even without SplitLines. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(launch).catch(launch);
    } else {
      launch();
    }
  }

  /* The hero video loops forever, which is exactly the kind of motion the OS
     setting is asking us to stop. Paused it falls back to its poster frame,
     so the hero still reads as a photograph rather than a flat panel. */
  function syncHeroVideo() {
    toArray(document.querySelectorAll('[data-hero-video]')).forEach(function (video) {
      if (prefersReduced()) {
        video.removeAttribute('autoplay');
        video.pause();
      } else if (video.paused) {
        /* Autoplay can still be refused (low-power mode, data saver); the
           poster stays up in that case, which is a fine outcome. */
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});
      }
    });
  }

  /* --------------------------------------------------------------------
     Lazy image fade

     Images marked [data-fade-in] start transparent and fade once the file has
     actually decoded, so a slow image resolves into place instead of popping
     against its placeholder. Anything already complete on the first pass is
     marked immediately — a cached image must not sit through a pointless
     transition, and a cached image never fires load.
     -------------------------------------------------------------------- */

  function markImageLoaded(img) {
    img.classList.add('is-loaded-img');
  }

  function initImageFades(root) {
    toArray((root || document).querySelectorAll('img[data-fade-in]')).forEach(function (img) {
      if (img.classList.contains('is-loaded-img')) return;

      /* complete covers cache hits AND images that finished while the parser
         was still working through the rest of the document. naturalWidth
         guards against complete being true for an image that failed. */
      if (img.complete && img.naturalWidth > 0) {
        markImageLoaded(img);
        return;
      }

      img.addEventListener('load', function () { markImageLoaded(img); }, { once: true });
      /* A broken image must not be left invisible. */
      img.addEventListener('error', function () { markImageLoaded(img); }, { once: true });
    });
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    staggerStepMs = readStaggerToken();

    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) { handleEntry(entry, obs); });
      }, OBSERVER_OPTS);

      counterObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
    }

    initHero();
    syncHeroVideo();
    initImageFades(document);
    observe(document);

    /* Live response to the OS setting changing — no reload required. */
    if (reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function () {
        staggerStepMs = readStaggerToken();
        syncHeroVideo();
        if (prefersReduced()) {
          toArray(document.querySelectorAll(REVEAL_SELECTOR)).forEach(function (el) {
            el.classList.add('is-revealed');
          });
          toArray(document.querySelectorAll('[data-count-to]')).forEach(setCounterFinal);
        }
      });
    }
  }

  return {
    init: init,
    observe: observe,
    prefersReduced: prefersReduced
  };
})();
