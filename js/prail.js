/* ==========================================================================
   prail.js — the home product rail
   --------------------------------------------------------------------------
   The row of product cards under the hero runs in one of TWO MODES, and this
   file's main job is choosing between them and measuring the one number the
   CSS needs.

     PANNED    wide screens, motion allowed, scroll-driven animations
               supported. The section pins against the top of the viewport and
               the row is swept left by page scroll until the last card is
               fully on screen, at which point the pin releases. The row's
               position is a pure function of scrollY, drawn by CSS off a view
               timeline — nothing here moves it. This file only:
                 · measures --prail-travel, how far the row moves, and
                   --prail-span, how much scrolling buys that movement
                 · adds .is-panned, the gate every pinned rule hangs off
                 · keeps .is-active on the card under the viewport centre
                 · scrolls the PAGE when a card off-screen takes focus
               There is no drag, no arrow key stepping and no scrollbar,
               because scrolling the page IS the control and a second way to
               move the row would fight a position derived from scrollY.

     FALLBACK  everything else — narrow screens, prefers-reduced-motion, and
               browsers with no scroll-driven animations. The row is an
               ordinary horizontal scroller: swipe or drag it, arrow-key it
               when it holds focus, and the progress thumb is positioned from
               its own scrollLeft. This is also what you get with no
               JavaScript at all, minus the drag and the auto-expansion.

   The mode is re-decided on resize, so dragging a desktop window narrow hands
   the row back to the fallback and widening it takes the pin back.

   Public API:
     ProductRail.init()   call once, AFTER Render has built the cards

   WHY THE ACTIVE CARD CANNOT OSCILLATE
   The active card is the one whose horizontal span contains the centre of the
   row, measured off client rects so the same test works whether the row is
   moved by a transform or by its own scrollLeft. That choice is stable under
   its own consequences: a card only ever grows to the RIGHT, so a card that
   already contained the centre still contains it once opened, cards to its
   left are untouched, and cards to its right move further away. Picking
   "nearest centre" instead would flip back and forth across the gap every time
   a width changed.
   ========================================================================== */

window.ProductRail = (function () {
  'use strict';

  /* Past this many pixels a pointer gesture is a drag, not a click. Small
     enough that a deliberate drag is caught immediately, large enough that the
     hand tremor in an ordinary click never is. */
  var DRAG_THRESHOLD = 6;

  /* Both halves matter. Width, because a pinned horizontal section on a phone
     hijacks the one gesture the reader has. Height, because the pin is a fixed
     100vh and its contents — heading, a card two thirds of that tall, and the
     progress foot — stop fitting inside a short viewport, and a sticky element
     taller than the viewport does not hold where you want it to. */
  var PAN_QUERY = '(min-width: 64rem) and (min-height: 44rem)';

  /* Breathing room kept between a focused card and the edge of the screen when
     the page is scrolled to bring it in. */
  var FOCUS_PAD = 32;

  /* How much SCROLLING one pixel of row movement costs. 1 makes the row track
     the scroll exactly; above that it hangs back and the row takes longer to
     get through, which is the whole knob for how heavy the pan feels. It is
     here rather than in the stylesheet because the focus handler has to do the
     same conversion to work out how far to scroll the page for a card that is
     off screen — one constant, both users. */
  var SCROLL_RATIO = 1.4;

  /* How much of the distance still to go the row covers in one 60Hz frame.
     This is the whole feel of the glide: lower is looser and takes longer to
     settle, higher is tighter, and 1 is the instant lock the pan had when CSS
     drove it. Past about .25 the trailing glide stops being visible at all. */
  var PAN_EASE = 0.11;

  /* Sub-pixel. Below this another frame cannot change what is drawn, so the
     chase snaps and the loop lets go rather than spinning towards a limit it
     will never reach. */
  var PAN_EPSILON = 0.05;

  /* One frame at 60Hz. The unit PAN_EASE is quoted in, and the yardstick the
     decay is normalised against on displays that are not 60Hz. */
  var FRAME_MS = 1000 / 60;

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  function reduced() {
    return !!(window.Motion && window.Motion.prefersReduced());
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /* The pin is worthless without the timeline that drives the row through it:
     the section would hold still for a screenful of scrolling while nothing
     moved. Tested rather than assumed, because this is the one capability the
     two modes actually differ on. */
  function supportsTimelines() {
    return typeof CSS !== 'undefined'
      && !!CSS.supports
      && CSS.supports('animation-timeline', 'view()');
  }

  function Rail(root) {
    this.root     = root;
    this.viewport = root.querySelector('[data-prail-viewport]');
    this.track    = root.querySelector('[data-prail-track]');
    this.cards    = this.track ? toArray(this.track.querySelectorAll('[data-prail-card]')) : [];

    /* The stage and the progress foot both sit OUTSIDE .prail, so the section
       is the scope: it is the nearest common ancestor of all three, and the
       one element the measured custom properties can be set on and still be
       inherited by the thumb. Setting them on .prail is the obvious mistake
       here — the thumb is a sibling of it, so nothing reaches it and the bar
       sits at its fallback full width forever. */
    this.scope = root.closest('section') || document.documentElement;
    this.stage = this.scope.querySelector('[data-prail-stage]');

    this.thumb = this.scope.querySelector('[data-prail-thumb]');

    this.active   = -1;
    this.travel   = 0;
    this.span     = 0;
    this.shift    = 0;
    this.pad      = 0;
    this.panned   = false;
    this.ticking  = false;
    this.pending  = false;
    this.drag     = null;

    /* Where the row actually is, in pixels of leftward travel, as opposed to
       where the scroll position says it should be. The gap between the two is
       the glide. */
    this.pan  = 0;
    this.raf  = 0;
    this.last = 0;

    if (this.viewport && this.cards.length) this.bind();
  }

  /* --------------------------------------------------------------------
     Measurement
     -------------------------------------------------------------------- */

  /* The track's left padding, read off the first card rather than off the
     computed style: it is a max() of two length units and only the layout
     knows which one won. This is the offset a card must land on to sit where
     card 0 sits at scrollLeft 0.

     Used by the fallback scroller AND published as --prail-lead by applyMode(),
     because the stylesheet cannot work this out for itself — see there. */
  Rail.prototype.inset = function () {
    return this.cards.length ? this.cards[0].offsetLeft : 0;
  };

  Rail.prototype.maxScroll = function () {
    return Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
  };

  /* Client rects, not offsetLeft: panned, the row is moved by a transform,
     which offsetLeft cannot see. Rects are what is actually on screen in both
     modes, so one test covers both.

     The fallback only runs when the centre lands in a gap or in the track's
     own padding, which is the one case where no span contains it. */
  Rail.prototype.indexAtCentre = function () {
    var box = this.viewport.getBoundingClientRect();
    var mid = box.left + box.width / 2;
    var best = 0;
    var bestDistance = Infinity;

    for (var i = 0; i < this.cards.length; i++) {
      var rect = this.cards[i].getBoundingClientRect();

      if (mid >= rect.left && mid < rect.right) return i;

      var distance = Math.min(Math.abs(mid - rect.left), Math.abs(mid - rect.right));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }

    return best;
  };

  /* --------------------------------------------------------------------
     Mode
     -------------------------------------------------------------------- */

  Rail.prototype.canPan = function () {
    return !reduced()
      && supportsTimelines()
      && !!this.stage
      && window.matchMedia(PAN_QUERY).matches;
  };

  /* Re-measures, then re-decides the mode. Safe to call as often as you like —
     everything it writes is derived, and the class is only touched when the
     answer actually changes. */
  /* html carries a scroll-padding-top that clears the fixed header, and a view
     timeline measures its named ranges against the scrollport that padding
     leaves behind rather than against the window. So the pin has to start at
     the padding, not at 0, or the range and the pin disagree by that many
     pixels and the row jumps the moment it is caught.

     READ, not recomputed. The expression lives in css/base.css and this only
     has to agree with whatever it currently resolves to — including `auto`,
     which parses to NaN and means no padding at all. */
  Rail.prototype.scrollPadding = function () {
    var value = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
    return isNaN(value) ? 0 : value;
  };

  Rail.prototype.applyMode = function () {
    /* A plain read. Every card is the same size and nothing in the row resizes
       on hover, focus or scroll position any more, so this is the row's width
       at every scroll position the pan can land on — there is no widest state
       to go looking for. */
    var width   = this.track.offsetWidth;
    var visible = this.viewport.clientWidth;

    this.pad    = this.scrollPadding();
    this.travel = Math.max(0, Math.round(width - visible));
    this.span   = Math.round(this.travel * SCROLL_RATIO);

    /* Thumb width is the visible fraction of the row; the shift is how far it
       then has to travel, expressed in its OWN widths so the CSS never has to
       measure the bar it sits in. A row that fits entirely on screen gets a
       full-width thumb and a shift of zero, which reads as "nothing to scroll"
       rather than as a control that does nothing. */
    var fraction = width ? Math.min(1, visible / width) : 1;
    this.shift = fraction > 0 ? ((1 - fraction) / fraction) * 100 : 0;

    this.scope.style.setProperty('--prail-pad', this.pad + 'px');
    this.scope.style.setProperty('--prail-span', this.span + 'px');
    this.scope.style.setProperty('--prail-thumb', fraction.toFixed(4));

    /* Read by nothing in the stylesheet — the row is moved from this.pan now.
       Published because it is the measurement the whole pinned section rests
       on, and having it on the section makes the geometry inspectable in
       DevTools without attaching a debugger. */
    this.scope.style.setProperty('--prail-travel', this.travel + 'px');

    /* The two numbers the cards' entrance is measured against: the width of the
       screen they fly in from, and the x each card is flying towards.

       --prail-view is clientWidth rather than 100vw for the same reason
       --prail-inset is a percentage rather than vw: a vertical scrollbar must
       not desynchronise the row from the heading above it. Already read above,
       so this costs no extra reflow.

       --prail-lead is inset(). THE STYLESHEET CANNOT COMPUTE THIS. --prail-inset
       is a max() containing a 100%, and a percentage inside a custom property
       resolves at the USE SITE — it means the section's width in the track's
       padding-inline, but the card's own width inside a translate3d(), which is
       out by up to ~250px. offsetLeft is a layout metric, so it is also immune
       to the very transform it is being used to size.

       Both are written in either mode. Fallback scopes the rules that read them
       out, so they are inert there rather than wrong. */
    this.scope.style.setProperty('--prail-view', visible + 'px');
    this.scope.style.setProperty('--prail-lead', this.inset() + 'px');

    /* A row with nothing to pan must not pin: the stage would be exactly one
       viewport tall, which is a pinned section that holds the page still while
       nothing whatsoever happens. */
    this.setPanned(this.travel > 0 && this.canPan());

    /* A resize changes both the travel and the span, so the row's position is
       now derived from different numbers than the ones it was last drawn with.
       Re-landing rather than chasing: the reader is dragging a window edge,
       and a row gliding across the screen while they do it reads as a fault. */
    if (this.panned) this.settle();

    this.update();
  };

  /* Resize fires per pixel dragged and applyMode() opens a card, reads layout,
     shuts it and reads again — three forced reflows a piece. One per frame is
     plenty for something only a window resize can change. */
  Rail.prototype.remeasure = function () {
    if (this.pending) return;
    this.pending = true;

    var self = this;
    window.requestAnimationFrame(function () {
      self.pending = false;
      self.applyMode();
    });
  };

  Rail.prototype.setPanned = function (panned) {
    if (panned === this.panned) return;
    this.panned = panned;

    this.scope.classList.toggle('is-panned', panned);

    if (panned) {
      /* The transform starts from a row sitting at scroll origin. Anything the
         reader had scrolled to in fallback mode would be added to it. */
      this.viewport.scrollLeft = 0;
      this.scope.style.setProperty('--prail-p', '0');

      /* Nothing left to scroll here, and a focus stop that does nothing is
         worse than no focus stop. The cards are links and remain tabbable. */
      this.viewport.removeAttribute('tabindex');

      /* Taking up the pan, not starting it: land on the current scroll
         position rather than gliding in from zero. */
      this.settle();
    } else {
      this.viewport.setAttribute('tabindex', '0');

      /* Handing the row back to its own scrollbar. The chased transform has to
         come off with the mode, or the row sits permanently offset by however
         far the pan had got — the fallback moves it by scrollLeft, which does
         not touch a transform. */
      this.stopPan();
      this.pan = 0;
      this.track.style.transform = '';
      if (this.thumb) this.thumb.style.transform = '';

      this.updateProgress();
    }
  };

  /* --------------------------------------------------------------------
     State
     -------------------------------------------------------------------- */

  Rail.prototype.setActive = function (index) {
    if (index === this.active) return;

    if (this.cards[this.active]) this.cards[this.active].classList.remove('is-active');
    if (this.cards[index])       this.cards[index].classList.add('is-active');

    this.active = index;
  };

  /* Fallback mode only. Panned, the thumb is moved by Rail.draw() from the
     same chased number as the row, so the two arrive together. */
  Rail.prototype.updateProgress = function () {
    if (this.panned) return;

    var max = this.maxScroll();
    this.scope.style.setProperty('--prail-p', max ? (this.viewport.scrollLeft / max).toFixed(4) : '0');
  };

  Rail.prototype.update = function () {
    this.setActive(this.indexAtCentre());
    this.updateProgress();
  };

  /* Scroll fires far faster than the screen repaints, and every handler here
     reads layout. One read per frame, at most. */
  Rail.prototype.onScroll = function () {
    if (this.ticking) return;
    this.ticking = true;

    var self = this;
    window.requestAnimationFrame(function () {
      self.ticking = false;
      self.update();
    });
  };

  /* --------------------------------------------------------------------
     The pan

     WHY THIS IS NOT A CSS SCROLL-DRIVEN ANIMATION, WHICH IT USED TO BE.
     A scroll-driven animation is a pure function of scroll position with no
     time in it at all: the row is exactly where the scrollbar says it is on
     every frame, so it starts and stops dead with the wheel. That is the one
     thing it cannot be asked to stop doing — `animation-timing-function`
     reshapes the mapping across the range, not the arrival, and a transition
     cannot touch a property an animation is already writing.

     So scroll position sets a TARGET and the row chases it. Everything the
     geometry was built on is unchanged — the target is still the same
     progress-through-the-span times the same travel, and it is still clamped
     to the same two ends, so the pan still lands exactly where the pin
     releases. The row simply arrives a few frames later than the scroll does,
     and glides the last of the distance after the wheel has stopped.
     -------------------------------------------------------------------- */

  /* Where the row should be, in pixels of leftward travel, for the current
     scroll position. The span is the SCROLLING the pan is given and the travel
     is how far the row moves through it — see SCROLL_RATIO. */
  Rail.prototype.panTarget = function () {
    if (!this.stage || !this.span) return 0;

    var origin = this.stage.getBoundingClientRect().top + window.pageYOffset - this.pad;
    return clamp((window.pageYOffset - origin) / this.span, 0, 1) * this.travel;
  };

  /* The row and the progress thumb are moved from the SAME number, so the two
     can never disagree about how far through the row you are. The thumb's
     shift is carried in its own widths, which is why it needs no measurement
     of the bar it sits in. */
  Rail.prototype.draw = function () {
    var progress = this.travel ? this.pan / this.travel : 0;

    this.track.style.transform = 'translate3d(' + (-this.pan).toFixed(2) + 'px, 0, 0)';

    if (this.thumb) {
      this.thumb.style.transform = 'translate3d(' + (progress * this.shift).toFixed(3) + '%, 0, 0)';
    }
  };

  /* Jump the row to wherever the scroll position says, with no chase. For
     taking up the pan mid-page — a reload inside the section, or the section
     coming back into view after the reader has scrolled somewhere else — where
     easing in from a stale position would play a slide nobody asked for. */
  Rail.prototype.settle = function () {
    this.pan = this.panTarget();
    this.draw();
  };

  Rail.prototype.startPan = function () {
    if (this.raf) return;

    var self = this;
    this.last = 0;
    this.raf = window.requestAnimationFrame(function (now) { self.advance(now); });
  };

  Rail.prototype.stopPan = function () {
    if (!this.raf) return;
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  /* advance(), NOT step(). step() is the arrow-key stepper further down, and
     because it is defined later on the same prototype it silently wins — a
     frame callback named step() gets replaced by a keyboard handler that reads
     its timestamp argument as a direction, scrolls a container that no longer
     scrolls, and never schedules the next frame. Nothing throws; the row
     simply never moves. */
  Rail.prototype.advance = function (now) {
    var self = this;
    var target = this.panTarget();
    var delta  = target - this.pan;

    /* Close enough that another frame would not move a pixel. Snapped rather
       than left a fraction short, so the row's resting position is exactly the
       one the pin released on. */
    if (Math.abs(delta) < PAN_EPSILON) {
      this.pan = target;
      this.raf = 0;
      this.draw();
      this.update();
      return;
    }

    /* Frame-rate independent. A flat fraction per frame would glide at half
       the rate on a 120Hz screen as on a 60Hz one; converting it to a decay
       over elapsed time makes the chase take the same number of MILLISECONDS
       on both. dt is capped because a backgrounded tab hands back one enormous
       frame, and an uncapped decay would resolve it to an instant jump. */
    var dt = this.last ? Math.min(now - this.last, 64) : FRAME_MS;
    this.last = now;

    this.pan += delta * (1 - Math.pow(1 - PAN_EASE, dt / FRAME_MS));

    this.draw();
    this.update();

    this.raf = window.requestAnimationFrame(function (next) { self.advance(next); });
  };

  /* Page scroll only matters while panned — it is what moves the row — and
     only while the section is anywhere near the screen. One rect read to
     decide that is cheaper than the work it guards.

     Off screen the row is snapped rather than chased. The chase exists to be
     watched, and easing a row nobody is looking at only means it is still
     mid-glide when it arrives back in view. */
  Rail.prototype.onPageScroll = function () {
    if (!this.panned) return;

    var box = this.scope.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) {
      this.stopPan();
      this.settle();
      return;
    }

    this.startPan();
  };

  /* --------------------------------------------------------------------
     Stepping — fallback mode only
     -------------------------------------------------------------------- */

  Rail.prototype.scrollToCard = function (index) {
    index = clamp(index, 0, this.cards.length - 1);

    this.viewport.scrollTo({
      left: Math.max(0, this.cards[index].offsetLeft - this.inset()),
      behavior: reduced() ? 'auto' : 'smooth'
    });
  };

  /* Steps off the LEADING visible card, not off the active one. The active
     card is whichever sits at the centre, so stepping from it would skip the
     card between it and the edge you are looking at. */
  Rail.prototype.step = function (direction) {
    var edge = this.viewport.scrollLeft + this.inset();
    var current = 0;

    for (var i = 0; i < this.cards.length; i++) {
      /* +2px of tolerance: after a smooth scroll the card sitting exactly on
         the edge can measure a fraction of a pixel short of it. */
      if (this.cards[i].offsetLeft <= edge + 2) current = i;
    }

    this.scrollToCard(current + direction);
  };

  /* --------------------------------------------------------------------
     Focus

     Panned, a card that is off the right of the screen cannot be scrolled into
     view by the browser: there is no scroll container to scroll, and its
     position is a function of where the PAGE is. So tabbing to it scrolls the
     page instead. The pan is one pixel of row per pixel of page, which is what
     makes this a straight addition rather than a ratio.
     -------------------------------------------------------------------- */

  Rail.prototype.onFocusIn = function (e) {
    /* Unpinned the row is a real scroll container and the browser has already
       done this natively, correctly, before this handler ran. */
    if (!this.panned || !this.stage) return;

    var card = e.target && e.target.closest ? e.target.closest('[data-prail-card]') : null;
    if (!card) return;

    var box  = this.viewport.getBoundingClientRect();
    var rect = card.getBoundingClientRect();
    var delta = 0;

    if (rect.right > box.right - FOCUS_PAD)     delta = rect.right - box.right + FOCUS_PAD;
    else if (rect.left < box.left + FOCUS_PAD)  delta = rect.left - box.left - FOCUS_PAD;
    if (!delta) return;

    /* The pin starts where the stage's top edge meets the top of the
       SCROLLPORT — the stage's document offset less the scroll padding, the
       same offset the stage height is built around.

       `delta` is in ROW pixels and the page is scrolled in SCROLL pixels, so
       it has to be geared up by the same ratio the span was. Clamped to the
       span: a card can be off screen because the pan has not started yet, and
       pushing past either end would scroll the section away rather than into
       it. */
    var origin   = this.stage.getBoundingClientRect().top + window.pageYOffset - this.pad;
    var progress = clamp(window.pageYOffset - origin, 0, this.span);

    window.scrollTo({
      top: origin + clamp(progress + delta * SCROLL_RATIO, 0, this.span),
      behavior: reduced() ? 'auto' : 'smooth'
    });
  };

  /* --------------------------------------------------------------------
     Drag to scroll — fallback mode only

     Mouse and pen only. Touch already drags natively, with momentum this
     cannot reproduce, and hijacking it would also swallow the vertical
     component of a diagonal swipe — leaving the page unable to scroll past
     the rail on a phone.
     -------------------------------------------------------------------- */

  Rail.prototype.onPointerDown = function (e) {
    if (this.panned) return;
    if (e.pointerType === 'touch') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    this.drag = { x: e.clientX, from: this.viewport.scrollLeft, moved: 0 };

    /* Capture so a drag that leaves the row still tracks, and still ends. */
    try { this.viewport.setPointerCapture(e.pointerId); } catch (err) {}
  };

  Rail.prototype.onPointerMove = function (e) {
    if (!this.drag) return;

    var dx = e.clientX - this.drag.x;
    this.drag.moved = Math.max(this.drag.moved, Math.abs(dx));

    if (this.drag.moved > DRAG_THRESHOLD) {
      /* .is-dragging suppresses the hover expansion in CSS — see the
         :not(.is-dragging) guards in sections.css. */
      this.viewport.classList.add('is-dragging');
      /* Otherwise the browser starts a text/image selection mid-drag. */
      e.preventDefault();
    }

    this.viewport.scrollLeft = this.drag.from - dx;
  };

  Rail.prototype.onPointerUp = function () {
    if (!this.drag) return;

    var wasDrag = this.drag.moved > DRAG_THRESHOLD;
    this.drag = null;
    this.viewport.classList.remove('is-dragging');

    /* Every card is a link, so releasing a drag over one would navigate. The
       click arrives immediately after pointerup, so a capture-phase listener
       removed on the next tick catches exactly that one and nothing later. */
    if (!wasDrag) return;

    var viewport = this.viewport;
    function swallow(event) {
      event.preventDefault();
      event.stopPropagation();
    }

    viewport.addEventListener('click', swallow, true);
    window.setTimeout(function () {
      viewport.removeEventListener('click', swallow, true);
    }, 0);
  };

  /* --------------------------------------------------------------------
     Wiring
     -------------------------------------------------------------------- */

  Rail.prototype.bind = function () {
    var self = this;

    this.viewport.addEventListener('scroll', function () { self.onScroll(); }, { passive: true });
    window.addEventListener('scroll', function () { self.onPageScroll(); }, { passive: true });

    this.viewport.addEventListener('focusin', function (e) { self.onFocusIn(e); });

    this.viewport.addEventListener('pointerdown', function (e) { self.onPointerDown(e); });
    this.viewport.addEventListener('pointermove', function (e) { self.onPointerMove(e); });
    this.viewport.addEventListener('pointerup', function () { self.onPointerUp(); });
    this.viewport.addEventListener('pointercancel', function () { self.onPointerUp(); });

    /* Only when the ROW itself has focus, and only when it is a scroller at
       all. A card inside it is a link, and stealing its arrow keys would break
       the browser's own caret navigation for anyone reading the card with a
       screen reader. */
    this.viewport.addEventListener('keydown', function (e) {
      if (self.panned || e.target !== self.viewport) return;

      if (e.key === 'ArrowRight')     { e.preventDefault(); self.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); self.step(-1); }
      else if (e.key === 'Home')      { e.preventDefault(); self.scrollToCard(0); }
      else if (e.key === 'End')       { e.preventDefault(); self.scrollToCard(self.cards.length - 1); }
    });

    /* The VIEWPORT, never the track. The viewport only changes size when the
       window does, which is exactly when the mode and the measurements need
       revisiting. (The track no longer changes size at all — nothing in the
       row resizes — but observing it would still be wrong, because a
       measurement that reacts to the layout it just caused is a loop waiting
       for someone to reintroduce a width change.) */
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { self.remeasure(); }).observe(this.viewport);
    } else {
      window.addEventListener('resize', function () { self.remeasure(); });
    }

    /* Card widths depend on the webfont: the title wraps to a different number
       of lines under the Segoe fallback, and the row measured before the swap
       is not the row that ends up on screen. --prail-travel is measured off
       that width, and a stale one would stop the pan short of the last card. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { self.applyMode(); }).catch(function () {});
    }

    this.applyMode();
  };

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    toArray(document.querySelectorAll('[data-prail]')).forEach(function (root) {
      return new Rail(root);
    });
  }

  return { init: init };
})();
