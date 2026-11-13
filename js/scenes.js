/* ==========================================================================
   scenes.js — the scroll-driven set pieces
   --------------------------------------------------------------------------
   Three scenes, all driven from ONE rAF-throttled scroll listener:

   1. Kinetic type   [data-kinetic] > [data-kinetic-row="1|-1"] > .kinetic__track
      Two rows of big type drift in opposite directions and speed up with
      the scroll velocity. The track's content is cloned until one loop is
      wider than the screen, so the wrap point is never visible.

   2. Manifesto      [data-manifesto] with [data-manifesto-text]
      The section pins (.is-pinned → sticky, 230vh tall) and the statement
      lights up word by word as it scrolls. Words inside <em> light red.
      NOT IN USE: the user preferred the statement shown in full, so the
      About statement carries no data-manifesto and this scene skips.

   3. Sideways products   [data-hscroll] > [data-hscroll-pin] > … [data-hscroll-track]
      On desktop the section pins and its card row moves sideways, one px
      of row per px of scroll (the section is made exactly that much taller).
      Links and keyboard focus that land on a card off to the side scroll the
      page to where that card is in view. On phones, tablets, short screens
      and under reduced motion it is a plain swipeable row.

   Without JS, or with reduced motion, every scene is a normal static block:
   the pinning, the dimmed words and the motion are all added here.

   Public API:  Scenes.init()
   Global:      window.Scenes
   ========================================================================== */

window.Scenes = (function () {
  'use strict';

  var PIN_QUERY = '(min-width: 64rem) and (min-height: 600px)';

  var ticking = false;
  var lastY = 0;
  var velocity = 0;
  var kinetic = null;
  var manifesto = null;
  var hs = null;

  function reduced() {
    return window.Motion ? window.Motion.prefersReduced() : false;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ====================================================================
     1. KINETIC TYPE
     ==================================================================== */

  function initKinetic() {
    var host = document.querySelector('[data-kinetic]');
    if (!host || reduced()) return;

    var rows = Array.prototype.map.call(host.querySelectorAll('[data-kinetic-row]'), function (row) {
      var track = row.querySelector('.kinetic__track');
      return {
        dir: parseFloat(row.getAttribute('data-kinetic-row')) || 1,
        track: track,
        set: track ? track.innerHTML : '',
        loop: 0,
        x: 0
      };
    }).filter(function (r) { return r.track; });

    if (!rows.length) return;

    /* The markup holds the set twice; measure one set, then clone until the
       track covers the screen plus one loop. */
    function measure() {
      rows.forEach(function (r) {
        r.track.innerHTML = r.set;
        var kids = r.track.children;
        var half = kids.length / 2;
        r.loop = half >= 1 && kids[half] ? kids[half].offsetLeft - kids[0].offsetLeft : r.track.scrollWidth / 2;
        if (r.loop <= 0) return;
        var copies = Math.ceil((window.innerWidth + r.loop) / r.loop);
        var html = r.set;
        for (var i = 1; i < copies; i++) html += r.set;
        r.track.innerHTML = html;
      });
    }

    var visible = false;
    var running = false;

    function frame() {
      if (!visible) { running = false; return; }
      /* Base drift plus a boost from the scroll velocity, eased back down */
      velocity *= 0.9;
      var boost = clamp(Math.abs(velocity) * 0.35, 0, 18);
      var sign = velocity < -0.5 ? -1 : 1;
      rows.forEach(function (r) {
        if (!r.loop) return;
        r.x -= (0.6 + boost) * r.dir * sign;
        if (r.x <= -r.loop) r.x += r.loop;
        if (r.x > 0) r.x -= r.loop;
        r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)';
      });
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      window.requestAnimationFrame(frame);
    }

    measure();
    /* Row 2 starts half a loop in, so the two rows never line up */
    if (rows[1]) rows[1].x = -rows[1].loop / 2;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }).observe(host);
    } else {
      visible = true;
      start();
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    kinetic = { measure: measure };
  }

  /* ====================================================================
     2. MANIFESTO
     ==================================================================== */

  /* Wrap every word in a span, in place, so <em> and other inline markup
     survive. Words inside <em> are flagged as keys and light up red. */
  function wrapWords(root) {
    var words = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      var key = !!(node.parentNode && node.parentNode.closest && node.parentNode.closest('em'));
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var span = document.createElement('span');
        span.className = 'manifesto__word' + (key ? ' is-key' : '');
        span.textContent = part;
        frag.appendChild(span);
        words.push(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return words;
  }

  function initManifesto() {
    var section = document.querySelector('[data-manifesto]');
    var text = section && section.querySelector('[data-manifesto-text]');
    if (!section || !text || reduced()) return;

    var words = wrapWords(text);
    if (!words.length) return;

    section.classList.add('is-pinned');
    manifesto = { section: section, words: words, lit: -1 };
  }

  function updateManifesto() {
    if (!manifesto) return;
    var rect = manifesto.section.getBoundingClientRect();
    var travel = rect.height - window.innerHeight;
    var p = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 1;
    /* Finish a little before the pin releases, so the full statement holds
       on screen for a beat. */
    var lit = Math.round(clamp(p / 0.82, 0, 1) * manifesto.words.length);
    if (lit === manifesto.lit) return;
    manifesto.lit = lit;
    manifesto.words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
  }

  /* ====================================================================
     3. SIDEWAYS PRODUCTS
     ==================================================================== */

  function initHScroll() {
    var section = document.querySelector('[data-hscroll]');
    if (!section) return;
    var track = section.querySelector('[data-hscroll-track]');
    var viewport = section.querySelector('[data-hscroll-viewport]');
    var bar = section.querySelector('[data-hscroll-bar]');
    if (!track || !viewport) return;

    var query = window.matchMedia ? window.matchMedia(PIN_QUERY) : null;

    hs = { section: section, track: track, viewport: viewport, bar: bar, pinned: false, distance: 0, query: query };

    layoutHScroll();

    if (query && query.addEventListener) query.addEventListener('change', layoutHScroll);

    /* Images change the row's width as they decode */
    Array.prototype.forEach.call(track.querySelectorAll('img'), function (img) {
      if (!img.complete) img.addEventListener('load', layoutHScroll, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHScroll);

    /* Swiping the unpinned row still drives the progress bar */
    viewport.addEventListener('scroll', function () {
      if (hs.pinned || !hs.bar) return;
      var max = viewport.scrollWidth - viewport.clientWidth;
      section.style.setProperty('--hscroll-p', max > 0 ? (viewport.scrollLeft / max).toFixed(4) : 0);
    }, { passive: true });

    /* A link to a card (the header flyout, the diagram's "See the …"
       links): nav.js scrolls to the section first, then this corrects the
       target to where the card is actually in view. Runs after nav.js's
       listener, which was bound earlier. */
    document.addEventListener('click', function (e) {
      if (!hs.pinned) return;
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (!link) return;
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target || !track.contains(target)) return;
      window.scrollTo({ top: scrollTopFor(target), behavior: reduced() ? 'auto' : 'smooth' });
    });

    /* Keyboard: a focused card off to the side is brought into view */
    track.addEventListener('focusin', function (e) {
      if (!hs.pinned) return;
      var card = e.target.closest('.product-card, .product-group__head') || e.target;
      var box = card.getBoundingClientRect();
      if (box.left >= 0 && box.right <= window.innerWidth) return;
      window.scrollTo({ top: scrollTopFor(card), behavior: 'auto' });
    });
  }

  /* The page scroll position that brings `el` to the row's start line */
  function scrollTopFor(el) {
    var start = parseFloat(getComputedStyle(hs.track).paddingLeft) || 0;
    var left = el.getBoundingClientRect().left - hs.track.getBoundingClientRect().left;
    var want = clamp(left - start, 0, hs.distance);
    var sectionTop = hs.section.getBoundingClientRect().top + window.scrollY;
    return Math.round(sectionTop + want);
  }

  function currentShift() {
    var rect = hs.section.getBoundingClientRect();
    return clamp(-rect.top, 0, hs.distance);
  }

  function layoutHScroll() {
    if (!hs) return;
    var want = !!(hs.query && hs.query.matches) && !reduced();

    hs.section.classList.toggle('is-pinned', want);
    hs.pinned = want;
    hs.track.style.transform = '';

    if (!want) {
      hs.section.style.removeProperty('--hscroll-h');
      return;
    }

    /* One px of scroll moves the row one px: the section is the screen
       plus however far the row overhangs it. */
    hs.distance = Math.max(0, hs.track.scrollWidth - hs.viewport.clientWidth);
    hs.section.style.setProperty('--hscroll-h', (window.innerHeight + hs.distance) + 'px');
    updateHScroll();
  }

  function updateHScroll() {
    if (!hs || !hs.pinned) return;
    var shift = currentShift();
    hs.track.style.transform = 'translate3d(' + (-shift).toFixed(1) + 'px,0,0)';
    hs.section.style.setProperty('--hscroll-p', hs.distance ? (shift / hs.distance).toFixed(4) : 0);
  }

  /* ====================================================================
     One scroll listener for all three
     ==================================================================== */

  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    velocity += (y - lastY) * 0.25;
    lastY = y;
    updateManifesto();
    updateHScroll();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  var resizeTimer = null;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (kinetic) kinetic.measure();
      layoutHScroll();
      onFrame();
    }, 150);
  }

  function init() {
    lastY = window.scrollY || window.pageYOffset;
    initKinetic();
    initManifesto();
    initHScroll();
    onFrame();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  return { init: init };
})();
