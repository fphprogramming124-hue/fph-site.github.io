/* ==========================================================================
   split-lines.js — line-by-line masked text reveal
   --------------------------------------------------------------------------
   Headings opt in with a single attribute:

     <h2 data-reveal data-split-lines>Three decades in Laguna</h2>

   Each word is wrapped in a clipping box, words are grouped into visual lines
   by measured offsetTop, and every line slides up out of its own mask with a
   --stagger-line delay between them. See css/animations.css for the matching
   rules.

   WHY WORDS AND NOT LINE WRAPPERS
   The obvious implementation moves each line's words into a <div class="line">
   wrapper. That breaks any inline markup spanning a line break — the hero's
   "The Real Japan <em>Technology</em>" would have its <em> torn in half.
   Wrapping each word in place keeps every word inside its original parent, so
   arbitrary inline markup survives untouched. Words on the same line share a
   --line-index and therefore a delay, so it reads as a line mask regardless.

   THE SPLIT DOM IS TEMPORARY
   Once the reveal finishes, the original innerHTML is put back. Per-word spans
   break text selection and copy/paste, so they must not outlive the animation.

   FAILURE IS SAFE
   If this module never runs, throws, or bails, the element keeps the plain
   [data-reveal] treatment from animations.css — a normal fade-and-rise. The
   masking rules only apply once .is-split has been added, and only this file
   adds it.

   Public API:
     SplitLines.init()          call once, after Motion.init()
     SplitLines.split(root)     split any [data-split-lines] under root

   ========================================================================== */

window.SplitLines = (function () {
  'use strict';

  var SELECTOR   = '[data-split-lines]';
  var WORD_CLASS = 'split-word';
  var INNER_CLASS = 'split-word__inner';

  /* offsetTop jitters by a fraction of a pixel between words on the same line
     (different glyph metrics, sub-pixel layout). Anything under this is the
     same line. A real line break is at least one line-height away. */
  var LINE_EPSILON = 2;

  var resizeTimer = null;

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  function prefersReduced() {
    /* Motion owns the media query and keeps it live; don't open a second one. */
    return !!(window.Motion && window.Motion.prefersReduced());
  }

  /* --------------------------------------------------------------------
     Wrapping
     -------------------------------------------------------------------- */

  /* Wrap every word of every descendant text node, in place. Whitespace is
     preserved as real text nodes so the browser breaks lines exactly where it
     did before wrapping — otherwise measuring would describe a layout the
     reader never sees. */
  function wrapWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var texts = [];
    var node;

    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim()) texts.push(node);
    }

    texts.forEach(function (textNode) {
      var frag = document.createDocumentFragment();
      var parts = textNode.nodeValue.split(/(\s+)/);

      parts.forEach(function (part) {
        if (!part) return;

        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }

        var outer = document.createElement('span');
        outer.className = WORD_CLASS;

        var inner = document.createElement('span');
        inner.className = INNER_CLASS;
        inner.textContent = part;

        outer.appendChild(inner);
        frag.appendChild(outer);
      });

      textNode.parentNode.replaceChild(frag, textNode);
    });

    return toArray(el.querySelectorAll('.' + WORD_CLASS));
  }

  /* Words are laid out left-to-right, top-to-bottom, so offsetTop only ever
     increases. A jump greater than the epsilon is a new line. */
  function assignLineIndices(words) {
    var lineTop = null;
    var index = -1;

    words.forEach(function (word) {
      var top = word.offsetTop;
      if (lineTop === null || top - lineTop > LINE_EPSILON) {
        lineTop = top;
        index += 1;
      }
      word.style.setProperty('--line-index', index);
    });

    return index + 1;
  }

  /* --------------------------------------------------------------------
     Split / restore
     -------------------------------------------------------------------- */

  function restore(el) {
    if (el.__splitOriginal == null) return;
    el.innerHTML = el.__splitOriginal;
    el.__splitOriginal = null;
    el.classList.remove('is-split');
  }

  /* Put the original markup back once the last line has landed. The last word
     sits on the last line and therefore carries the longest delay, so its
     transitionend is the end of the whole reveal.

     There is deliberately NO timeout fallback here. A heading the reader never
     scrolls to never transitions, and restoring it on a timer would strip the
     mask before it ever got to animate. Leaving it split costs nothing — the
     text is still in the DOM and still read correctly by assistive tech. */
  function armRestore(el, words) {
    var last = words[words.length - 1].firstChild;

    function onEnd(e) {
      if (e.propertyName !== 'transform' || e.target !== last) return;
      el.removeEventListener('transitionend', onEnd);
      restore(el);
    }

    el.addEventListener('transitionend', onEnd);
  }

  /* .is-revealed can land on the heading itself or on an ancestor wrapper
     (<div class="section-head" data-reveal>), and either means the reveal has
     already fired. Splitting at that point would hide text that is on screen —
     a real risk above the fold, where IntersectionObserver fires immediately
     but this module is still waiting on document.fonts.ready. */
  function alreadyRevealed(el) {
    if (el.closest('.is-revealed')) return true;

    /* The hero is time-triggered rather than scroll-triggered: html.is-loaded
       is its reveal. main.js also force-adds that class after 1200ms as a
       safety net, which can beat a slow font load — so check it here too, or
       a slow connection would see the hero appear and then be re-hidden. */
    if (el.hasAttribute('data-hero-seq') &&
        document.documentElement.classList.contains('is-loaded')) {
      return true;
    }

    return false;
  }

  function splitOne(el) {
    if (alreadyRevealed(el)) return;
    if (el.classList.contains('is-split')) return;

    el.__splitOriginal = el.innerHTML;

    var words = wrapWords(el);
    if (!words.length) {
      restore(el);
      return;
    }

    assignLineIndices(words);
    armRestore(el, words);

    /* Added last: until this class lands the element is styled by the plain
       [data-reveal] rules, so a throw anywhere above leaves a working reveal. */
    el.classList.add('is-split');
  }

  function split(root) {
    if (prefersReduced()) return;
    toArray((root || document).querySelectorAll(SELECTOR)).forEach(splitOne);
  }

  /* --------------------------------------------------------------------
     Resize — line breaks move, so the grouping has to be recomputed.
     Only unrevealed headings are re-split; anything mid-flight or already
     restored is left alone.
     -------------------------------------------------------------------- */

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (prefersReduced()) return;
      toArray(document.querySelectorAll(SELECTOR)).forEach(function (el) {
        if (alreadyRevealed(el)) return;
        if (!el.classList.contains('is-split')) return;
        restore(el);
        splitOne(el);
      });
    }, 200);
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    if (prefersReduced()) return;

    /* MUST wait for the webfont. Source Sans has different metrics to the
       Segoe fallback, so measuring before it lands groups words into
       lines that do not exist once the real face swaps in — headings then
       animate in visibly wrong chunks. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { split(document); });
    } else {
      split(document);
    }

    window.addEventListener('resize', onResize);
  }

  return {
    init: init,
    split: split
  };
})();
