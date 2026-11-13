/* ==========================================================================
   main.js — bootstrap
   --------------------------------------------------------------------------
   Runs last. Starts the animation system, navigation, content rendering and
   the contact form, and wires the shared accordion behaviour.

   Each subsystem is started inside its own try/catch: a failure in one must
   never take the whole page down with it.
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------
     Accordions — one delegated listener for every accordion on the page
     (product specs, job listings, FAQ). Triggers opt in with [data-accordion].
     -------------------------------------------------------------------- */

  function initAccordions() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-accordion]');
      if (!trigger) return;

      var panelId = trigger.getAttribute('aria-controls');
      var panel = panelId && document.getElementById(panelId);
      if (!panel) return;

      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
    });
  }

  /* --------------------------------------------------------------------
     Footer year
     -------------------------------------------------------------------- */

  function initYear() {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* --------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------- */

  function safely(label, fn) {
    try {
      fn();
    } catch (err) {
      /* Logged, not thrown — one broken subsystem must not blank the page. */
      if (window.console && console.error) {
        console.error('[FCC] ' + label + ' failed to initialise:', err);
      }
    }
  }

  function boot() {
    /* The loader counts from the first frame, so it starts before anything
       heavier. It only reads tokens and its own markup. */
    safely('intro',   function () { if (window.Intro)       window.Intro.init(); });
    /* Content first, so Motion.init() sees the injected DOM on its first pass */
    safely('render',  function () { if (window.Render)      window.Render.init(); });
    safely('motion',  function () { if (window.Motion)      window.Motion.init(); });
    /* After motion: SplitLines asks Motion for the reduced-motion state, and
       skips any heading Motion has already revealed. */
    safely('splitLines', function () { if (window.SplitLines) window.SplitLines.init(); });
    /* After render (the cards must exist) and after motion (the rail asks it
       for the reduced-motion state before choosing smooth or instant scroll). */
    safely('productRail', function () { if (window.ProductRail) window.ProductRail.init(); });
    safely('nav',     function () { if (window.Nav)         window.Nav.init(); });
    /* Before ContactForm: its "Request a quote" link closes the modal on the
       dialog, then the click bubbles on to ContactForm and Nav. */
    safely('productModal', function () { if (window.ProductModal) window.ProductModal.init(); });
    safely('contact', function () { if (window.ContactForm) window.ContactForm.init(); });
    /* After motion (both ask it for the reduced-motion state) and after
       render (ServiceCheck reads DATA.products and borrows Render.esc). */
    safely('powerFlow',    function () { if (window.PowerFlow)    window.PowerFlow.init(); });
    safely('serviceCheck', function () { if (window.ServiceCheck) window.ServiceCheck.init(); });
    safely('toTop',        function () { if (window.ToTop)        window.ToTop.init(); });
    safely('secIndex',     function () { if (window.SecIndex)     window.SecIndex.init(); });
    /* After render (the product row must exist to be measured) and after
       nav (its link listener has to run before the scenes correct it). */
    safely('scenes',       function () { if (window.Scenes)       window.Scenes.init(); });
    safely('fx',           function () { if (window.FX)           window.FX.init(); });
    safely('accordions', initAccordions);
    safely('year', initYear);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* SAFETY NET — <main> starts at opacity 0 and is revealed by adding
     .is-loaded. If anything above throws before Motion.init() runs, this
     guarantees the page still becomes visible. */
  window.setTimeout(function () {
    document.documentElement.classList.add('is-loaded');
  }, 1200);
})();
