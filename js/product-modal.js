/* ==========================================================================
   product-modal.js — the product detail modal
   --------------------------------------------------------------------------
   Clicking a product card (anywhere on it, or its "View specifications"
   button) opens a modal centred on the screen: the product photo on the
   left, its name, summary and specifications table on the right, and a
   "Request a quote" link that pre-fills the contact form.

   Built on <dialog> + showModal(): the browser supplies the focus trap, the
   Esc key, the dimmed ::backdrop and inert page behind it. A click on the
   backdrop (the dialog element itself, outside its box) closes it too.
   Focus goes back to the card's button on close.

   The content comes from DATA.products, found by the card's
   data-product-open id, so a product added to data.js gets its modal with
   nothing else to touch.

   Public API:  ProductModal.init(), ProductModal.open(id)
   Global:      window.ProductModal
   ========================================================================== */

window.ProductModal = (function () {
  'use strict';

  var dialog = null;
  var body = null;
  var opener = null;

  function esc(v) { return window.Render ? window.Render.esc(v) : String(v == null ? '' : v); }
  function icon(name, cls) { return window.Render ? window.Render.icon(name, cls) : ''; }

  function findProduct(id) {
    var list = (window.DATA && window.DATA.products) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return { p: list[i], index: i };
    return null;
  }

  function findCategory(id) {
    var cats = (window.DATA && window.DATA.PRODUCT_CATEGORIES) || [];
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i];
    return null;
  }

  /* ---- Draggable 3D view ------------------------------------------------
     There is no 3D model of the parts, only the photo. So the photo is
     stacked into LAYERS in CSS 3D space: the front and back faces at full
     brightness (the back mirrored), the layers between darkened so they read
     as the rim. Dragging turns the stack; a slow spin runs until the visitor
     takes hold (never under reduced motion). */
  var LAYERS = 13;
  var TILT_MAX = 70;
  var spin = null;

  function viewer(p) {
    var half = (LAYERS - 1) / 2;
    var layers = '';
    for (var i = 0; i < LAYERS; i++) {
      var k = i - half;
      var cls = i === LAYERS - 1 ? ' viewer3d__layer--front' : (i === 0 ? ' viewer3d__layer--back' : '');
      layers += '<img class="viewer3d__layer' + cls + '" style="--k:' + k + '" src="' + esc(p.image) + '" alt="" decoding="async" draggable="false">';
    }
    return '' +
      '<div class="viewer3d" data-viewer3d tabindex="0" role="group" ' +
           'aria-label="3D view of ' + esc(p.name) + '. Drag, or use the arrow keys, to turn it.">' +
        '<div class="viewer3d__stage">' +
          '<span class="viewer3d__shadow" aria-hidden="true"></span>' +
          '<div class="viewer3d__obj" aria-hidden="true">' + layers + '</div>' +
        '</div>' +
        '<p class="viewer3d__hint" aria-hidden="true">' + icon('arrow-right', 'icon--sm') + 'Drag to turn</p>' +
        '<button type="button" class="viewer3d__reset" data-viewer-reset>Reset view</button>' +
      '</div>';
  }

  function stopViewer() {
    if (spin) { cancelAnimationFrame(spin.raf); spin.abort(); spin = null; }
  }

  function startViewer(root) {
    stopViewer();
    var el = root && root.querySelector('[data-viewer3d]');
    if (!el) return;
    var obj = el.querySelector('.viewer3d__obj');
    var home = { rx: -12, ry: 28 };
    var rx = home.rx, ry = home.ry, vx = 0, vy = 0;
    var dragging = false, lastX = 0, lastY = 0, auto = true;
    var reduced = window.Motion && window.Motion.prefersReduced && window.Motion.prefersReduced();
    var ctl = new AbortController();
    var sig = { signal: ctl.signal };

    function paint() {
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    }
    function clampX() { rx = Math.max(-TILT_MAX, Math.min(TILT_MAX, rx)); }

    function tick() {
      if (!dragging) {
        if (auto && !reduced) ry += 0.35;
        ry += vy; rx += vx;
        vx *= 0.93; vy *= 0.93;
        if (Math.abs(vx) < 0.01) vx = 0;
        if (Math.abs(vy) < 0.01) vy = 0;
        clampX();
      }
      paint();
      spin.raf = requestAnimationFrame(tick);
    }

    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-viewer-reset]')) return;
      dragging = true; auto = false; vx = vy = 0;
      lastX = e.clientX; lastY = e.clientY;
      el.classList.add('is-dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    }, sig);
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      ry += dx * 0.6; rx -= dy * 0.6; clampX();
      vy = dx * 0.6; vx = -dy * 0.6;
    }, sig);
    function release() { dragging = false; el.classList.remove('is-dragging'); }
    el.addEventListener('pointerup', release, sig);
    el.addEventListener('pointercancel', release, sig);

    el.addEventListener('keydown', function (e) {
      var step = 15, hit = true;
      if (e.key === 'ArrowLeft') ry -= step;
      else if (e.key === 'ArrowRight') ry += step;
      else if (e.key === 'ArrowUp') rx += step;
      else if (e.key === 'ArrowDown') rx -= step;
      else hit = false;
      if (hit) { e.preventDefault(); auto = false; vx = vy = 0; clampX(); }
    }, sig);

    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-viewer-reset]')) return;
      rx = home.rx; ry = Math.round(ry / 360) * 360 + home.ry; vx = vy = 0; auto = false;
    }, sig);

    spin = { raf: 0, abort: function () { ctl.abort(); } };
    paint();
    tick();
  }

  function content(p, index) {
    var cat = findCategory(p.category);
    var num = (index + 1 < 10 ? '0' : '') + (index + 1);
    var title = p.menuName || p.name;

    var rows = (p.specs || []).map(function (row) {
      return '<tr><th scope="row">' + esc(row[0]) + '</th><td>' + esc(row[1]) + '</td></tr>';
    }).join('');

    var tags = (p.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('');

    return '' +
      '<button type="button" class="product-modal__close" data-product-close aria-label="Close">' +
        icon('close') +
      '</button>' +
      '<div class="product-modal__media">' +
        '<span class="product-modal__num" aria-hidden="true">' + esc(num) + '</span>' +
        (p.image ? viewer(p) : '') +
      '</div>' +
      '<div class="product-modal__info">' +
        (cat ? '<p class="label"><span class="label__num">' + esc(cat.num) + '</span>' + esc(cat.name) + '</p>' : '') +
        '<h2 class="product-modal__title" id="product-modal-title">' + esc(title) + '</h2>' +
        (p.menuName && p.menuName !== p.name
          ? '<p class="product-card__fullname">' + esc(p.name) + '</p>'
          : '') +
        '<p class="product-modal__summary">' + esc(p.summary) + '</p>' +
        (tags ? '<div class="cluster cluster--sm">' + tags + '</div>' : '') +
        (rows
          ? '<h3 class="product-modal__spec-head">Specifications</h3>' +
            '<table class="spec-mini product-modal__specs"><tbody>' + rows + '</tbody></table>'
          : '') +
        '<div class="cluster product-modal__actions">' +
          '<a class="btn btn--accent" href="#contact" data-inquiry="sales" ' +
             'data-subject="' + esc('Quotation: ' + title) + '">' +
            '<span class="btn__label">Request a quote</span>' + icon('arrow-right', 'icon--sm') +
          '</a>' +
          '<a class="btn btn--ghost" href="#shop">Where to buy</a>' +
        '</div>' +
      '</div>';
  }

  function open(id, from) {
    var found = findProduct(id);
    if (!found || !dialog) return;

    opener = from || document.activeElement;
    body.innerHTML = content(found.p, found.index);

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.documentElement.classList.add('has-modal');

    var close = dialog.querySelector('[data-product-close]');
    if (close) close.focus();
    startViewer(body);
  }

  function close() {
    if (!dialog || !dialog.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); onClosed(); }
  }

  function onClosed() {
    stopViewer();
    document.documentElement.classList.remove('has-modal');
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  function init() {
    dialog = document.querySelector('[data-product-modal]');
    body = dialog && dialog.querySelector('[data-product-modal-body]');
    if (!dialog || !body) return;

    /* Any click on a card opens it, unless it landed on a real link */
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('[data-product-card]');
      if (!card || dialog.contains(card)) return;
      if (e.target.closest('a')) return;
      var trigger = card.querySelector('[data-product-open]');
      open(card.getAttribute('data-product-card'), trigger || card);
    });

    dialog.addEventListener('click', function (e) {
      /* The backdrop: the click lands on the <dialog> itself, outside the box */
      if (e.target === dialog) { close(); return; }
      if (e.target.closest('[data-product-close]')) { close(); return; }
      /* An in-page link (Request a quote, Where to buy): close first so the
         page can scroll; Nav and ContactForm then handle the click as it
         bubbles on to the document. */
      if (e.target.closest('a[href^="#"]')) close();
    });

    dialog.addEventListener('close', onClosed);
  }

  return { init: init, open: open, close: close };
})();
