/* ==========================================================================
   nav.js — navigation for a single continuously scrolling page
   --------------------------------------------------------------------------
   Owns: smooth scroll to sections, scrollspy (active link highlighting),
   the header scrolled state, the scroll progress bar, and the mobile drawer
   with a real focus trap.
   ========================================================================== */

window.Nav = (function () {
  'use strict';

  var DESKTOP_QUERY = '(min-width: 64rem)';   /* 1024px — matches layout.css */
  var SCROLLED_AT   = 24;                     /* px before the header compacts */

  var header, progressBar, toggle, drawer, backdrop;
  var navLinks = [];
  var sections = [];
  var lastFocused = null;
  var isOpen = false;
  var ticking = false;
  var desktopQuery;

  function toArray(n) { return Array.prototype.slice.call(n); }

  function reducedMotion() {
    return window.Motion ? window.Motion.prefersReduced() : false;
  }

  /* --------------------------------------------------------------------
     Header state + scroll progress bar
     Both run off one rAF-throttled scroll listener so we write to the DOM
     at most once per frame.
     -------------------------------------------------------------------- */

  function onScrollFrame() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      header.classList.toggle('is-scrolled', y > SCROLLED_AT);
    }

    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(y / max, 1) : 0;
      /* transform only — never width, which would force layout every frame */
      progressBar.style.transform = 'scaleX(' + pct + ')';
    }

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }

  /* --------------------------------------------------------------------
     Scrollspy — highlights the nav link for the section currently in view
     -------------------------------------------------------------------- */

  function setActive(id) {
    navLinks.forEach(function (link) {
      var match = link.getAttribute('href') === '#' + id;
      if (match) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initScrollSpy() {
    if (!('IntersectionObserver' in window) || !sections.length) return;

    /* Track how much of each section is visible and activate the winner.
       A plain "first intersecting" test flickers badly on a long page. */
    var ratios = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var bestId = null;
      var bestRatio = 0;
      Object.keys(ratios).forEach(function (id) {
        if (ratios[id] > bestRatio) {
          bestRatio = ratios[id];
          bestId = id;
        }
      });

      if (bestId) setActive(bestId);
    }, {
      /* Discount the area hidden behind the fixed header */
      rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--header-h'), 10) || 72) + 'px 0px -45% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* --------------------------------------------------------------------
     Smooth scroll
     CSS scroll-behavior handles most of it; this exists so that clicking a
     link also closes the drawer, moves focus to the section (screen-reader
     users must follow the jump), and respects reduced motion.
     -------------------------------------------------------------------- */

  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });

    /* Content above the target can still change size while a long smooth
       scroll runs (the product row grows as its images load), so the browser
       lands a few px off. When the scroll ends, nudge to the exact spot. */
    var settle = function () {
      var want = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
                 (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      var drift = target.getBoundingClientRect().top - want;
      if (Math.abs(drift) > 2) window.scrollBy({ top: drift, behavior: 'auto' });
    };
    if ('onscrollend' in window) window.addEventListener('scrollend', settle, { once: true });
    else window.setTimeout(settle, 1200);

    /* Move focus without a second scroll jump */
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;

      var id = link.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;

      e.preventDefault();
      if (isOpen) closeDrawer({ restoreFocus: false });

      setActive(id);
      scrollToSection(id);

      /* Keep the URL shareable without triggering a second native jump */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + id);
      }
    });
  }

  /* --------------------------------------------------------------------
     Products flyout panel
     Hover- and focus-driven, desktop only. CSS alone could do the hover
     half of this with :hover on a wrapper, but not the focus half, and not
     the grace period below — pointers cut the corner between the tab and
     the panel, and a panel that closes the instant the cursor leaves the
     link is unusable.
     -------------------------------------------------------------------- */

  var panelTrigger, panel, panelCloseTimer;
  var PANEL_CLOSE_DELAY = 140;   /* ms of grace while the pointer travels */

  function panelIsOpen() {
    return !!panel && panel.classList.contains('is-open');
  }

  function openPanel() {
    if (!panel || !panelTrigger) return;
    window.clearTimeout(panelCloseTimer);
    /* Below 1024 the desktop nav is hidden and the drawer is the menu */
    if (desktopQuery && !desktopQuery.matches) return;
    panel.classList.add('is-open');
    panelTrigger.setAttribute('aria-expanded', 'true');
  }

  function closePanel(opts) {
    if (!panel || !panelTrigger) return;
    window.clearTimeout(panelCloseTimer);
    panel.classList.remove('is-open');
    panelTrigger.setAttribute('aria-expanded', 'false');
    if (opts && opts.restoreFocus && panelTrigger.focus) panelTrigger.focus();
  }

  function closePanelSoon() {
    window.clearTimeout(panelCloseTimer);
    panelCloseTimer = window.setTimeout(function () { closePanel(); }, PANEL_CLOSE_DELAY);
  }

  function initNavPanel() {
    panelTrigger = document.querySelector('[data-nav-dropdown]');
    var id = panelTrigger && panelTrigger.getAttribute('aria-controls');
    panel = id ? document.getElementById(id) : null;
    if (!panelTrigger || !panel) return;

    [panelTrigger, panel].forEach(function (el) {
      el.addEventListener('mouseenter', openPanel);
      el.addEventListener('mouseleave', closePanelSoon);
      /* focusin/focusout bubble, so this covers the links inside the panel */
      el.addEventListener('focusin', openPanel);
      el.addEventListener('focusout', function (e) {
        var next = e.relatedTarget;
        if (next && (panelTrigger.contains(next) || panel.contains(next))) return;
        closePanel();
      });
    });

    /* Any anchor click — the tab itself or a category inside — is a jump, so
       the panel has done its job. initSmoothScroll handles the scrolling. */
    panelTrigger.addEventListener('click', function () { closePanel(); });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelIsOpen()) {
        e.preventDefault();
        closePanel({ restoreFocus: true });
      }
    });

    /* A pointer that leaves the header entirely (down into the page, or off
       the top of the window) should not leave the panel hanging open. */
    if (header) header.addEventListener('mouseleave', closePanelSoon);
  }

  /* --------------------------------------------------------------------
     Mobile drawer
     -------------------------------------------------------------------- */

  function focusableIn(root) {
    return toArray(root.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return el.offsetParent !== null;
    });
  }

  function lockScroll() {
    /* Compensate for the disappearing scrollbar so the page doesn't jump */
    var gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
  }

  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  function openDrawer() {
    if (isOpen || !drawer) return;
    isOpen = true;
    lastFocused = document.activeElement;

    drawer.hidden = false;
    if (backdrop) backdrop.hidden = false;

    /* Next frame, so the browser commits `hidden` removal before the
       transition class lands — otherwise the slide-in never runs. */
    window.requestAnimationFrame(function () {
      drawer.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
    });

    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    lockScroll();

    /* Hide the rest of the page from screen readers while the drawer is up */
    var main = document.getElementById('main');
    var foot = document.querySelector('.site-footer');
    if (main) main.setAttribute('aria-hidden', 'true');
    if (foot) foot.setAttribute('aria-hidden', 'true');

    var first = focusableIn(drawer)[0];
    if (first) first.focus();
  }

  function closeDrawer(opts) {
    if (!isOpen || !drawer) return;
    opts = opts || {};
    isOpen = false;

    drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    unlockScroll();

    var main = document.getElementById('main');
    var foot = document.querySelector('.site-footer');
    if (main) main.removeAttribute('aria-hidden');
    if (foot) foot.removeAttribute('aria-hidden');

    /* Re-apply `hidden` only after the slide-out finishes, with a timeout
       fallback so it can never get stuck visible-but-unreachable. */
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      drawer.hidden = true;
      if (backdrop) backdrop.hidden = true;
      drawer.removeEventListener('transitionend', finish);
    }
    drawer.addEventListener('transitionend', finish);
    window.setTimeout(finish, 400);

    /* Return focus where it came from. If the drawer was opened without a
       focused trigger (programmatically, or after a click that did not focus
       the button), fall back to the toggle rather than dropping focus to
       <body> — that would strand keyboard users at the top of the document. */
    if (opts.restoreFocus !== false) {
      var target = (lastFocused && lastFocused !== document.body && lastFocused.focus)
        ? lastFocused
        : toggle;
      if (target && target.focus) target.focus();
    }
  }

  function trapTab(e) {
    if (!isOpen || e.key !== 'Tab') return;

    var items = focusableIn(drawer);
    if (!items.length) return;

    var first = items[0];
    var last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function initDrawer() {
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', function () {
      isOpen ? closeDrawer() : openDrawer();
    });

    if (backdrop) {
      backdrop.addEventListener('click', function () { closeDrawer(); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeDrawer();
      }
      trapTab(e);
    });

    /* Crossing into desktop must not leave a hidden drawer holding focus */
    var onBreakpoint = function (e) { if (e.matches && isOpen) closeDrawer(); };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onBreakpoint);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onBreakpoint);
    }
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    header      = document.querySelector('.site-header');
    progressBar = document.querySelector('[data-scroll-progress]');
    toggle      = document.querySelector('[data-nav-toggle]');
    drawer      = document.querySelector('[data-drawer]');
    backdrop    = document.querySelector('[data-drawer-backdrop]');

    navLinks = toArray(document.querySelectorAll('[data-nav-link]'));

    /* One media query shared by the drawer and the flyout: the flyout only
       exists above it, the drawer only below. */
    desktopQuery = window.matchMedia(DESKTOP_QUERY);
    var onDesktopChange = function (e) { if (!e.matches) closePanel(); };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onDesktopChange);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onDesktopChange);
    }

    /* Scrollspy must only track sections that a nav link points at. Other
       anchored blocks (product categories, for instance) would otherwise
       clear the highlight as they scrolled past. */
    var navTargets = {};
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) === '#') navTargets[href.slice(1)] = true;
    });

    sections = toArray(document.querySelectorAll('main .section-anchor'))
      .filter(function (section) { return navTargets[section.id]; });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScrollFrame();

    initSmoothScroll();
    initScrollSpy();
    initNavPanel();
    initDrawer();

    /* Honour a deep link like index.html#products on first load */
    if (window.location.hash) {
      var id = window.location.hash.slice(1);
      if (document.getElementById(id)) {
        window.setTimeout(function () { scrollToSection(id); }, 120);
      }
    }
  }

  return { init: init, close: closeDrawer };
})();
