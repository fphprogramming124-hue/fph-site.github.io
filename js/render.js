/* ==========================================================================
   render.js — builds the dynamic sections from js/data.js
   --------------------------------------------------------------------------
   Products, Events, Careers, the FAQ and the Partner section's logo strip
   and distributor count are all rendered here. Every injection calls Motion.observe() afterwards so newly
   created elements animate exactly like static ones.

   You should not need to edit this file to change content — edit data.js.
   ========================================================================== */

window.Render = (function () {
  'use strict';

  var EVENTS_PER_PAGE = 6;

  var eventState = { filter: 'all', shown: EVENTS_PER_PAGE };
  var jobState   = { filter: 'all' };
  /* Luzon is the default island group shown in the Shop section */
  var distributorState = { region: 'luzon' };

  /* --------------------------------------------------------------------
     Helpers
     -------------------------------------------------------------------- */

  /* Escape anything that lands in innerHTML. The data is author-written,
     but escaping means an apostrophe or "&" in real copy can never break
     the markup. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function $(sel, root) { return (root || document).querySelector(sel); }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false">' +
           '<use href="#i-' + name + '"></use></svg>';
  }

  /* Real <img> when a path is given, CSS-drawn placeholder when it is not.
     This is why the project ships no binary placeholder files. */
  function media(image, label, ratio, dark, fit) {
    if (image) {
      return '<img src="' + esc(image) + '" alt="' + esc(label) + '" ' +
             'class="' + ratio + '" style="object-fit:' + (fit || 'cover') + ';width:100%" ' +
             'loading="lazy" decoding="async" data-fade-in>';
    }
    return '<div class="img-placeholder ' + ratio + (dark ? ' img-placeholder--dark' : '') + '">' +
             '<span class="img-placeholder__inner"></span>' +
             '<span class="img-placeholder__label">' + esc(label) + '</span>' +
           '</div>';
  }

  function formatDate(iso) {
    var parts = String(iso).split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var m = parseInt(parts[1], 10);
    return {
      day:   parts[2] || '--',
      month: months[m - 1] || '---',
      year:  parts[0] || '----',
      full:  (months[m - 1] || '---') + ' ' + (parts[2] || '--') + ', ' + (parts[0] || '----')
    };
  }

  /* Re-register injected DOM with the animation system */
  function activate(container) {
    if (window.Motion && container) window.Motion.observe(container);
  }

  /* --------------------------------------------------------------------
     PRODUCTS
     -------------------------------------------------------------------- */

  function productCard(p, index) {
    var tags = (p.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('');

    return '' +
      /* The id is the jump target for the header Products flyout — every
         product needs its own anchor, or every item in the menu would land
         on the top of its category group. */
      /* data-product-card: a click anywhere on the card opens the product
         modal (js/product-modal.js); the button below is the keyboard route. */
      '<article class="card product-card" id="prod-' + esc(p.id) + '" data-product-card="' + esc(p.id) + '" data-reveal data-spotlight data-tilt>' +
        '<div class="card__media aspect-4-3">' +
          /* `contain`: part photos are square and fill their own frame, so
             cropping them to 4:3 would cut the component's edges off. */
          media(p.image, p.image ? p.name : 'products/' + p.id + '.jpg · 4:3', 'aspect-4-3', false, 'contain') +
        '</div>' +
        '<div class="card__body">' +
          /* Part number is optional — omit the line entirely when absent so
             the card does not carry an empty row of whitespace. */
          (p.partNo ? '<p class="product-card__partno u-mono">' + esc(p.partNo) + '</p>' : '') +
          /* The short name is the headline; the full catalogue name, which
             runs to three slash-separated variants, sits under it. */
          '<h4 class="card__title">' + esc(p.menuName || p.name) + '</h4>' +
          (p.menuName && p.menuName !== p.name
            ? '<p class="product-card__fullname">' + esc(p.name) + '</p>'
            : '') +
          '<p class="card__text">' + esc(p.summary) + '</p>' +
          (tags ? '<div class="cluster cluster--sm">' + tags + '</div>' : '') +
          '<div class="card__foot">' +
            '<button type="button" class="product-card__open" data-product-open aria-haspopup="dialog">' +
              '<span>View specifications</span>' + icon('plus') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* The Products flyout in the header. Built from the same two arrays the
     section itself is built from, so adding a product to data.js puts it in
     the menu with no HTML to touch. Deliberately NOT passed to activate():
     the header is chrome and must never be waiting on a scroll reveal. */
  function renderNavPanel() {
    var host = $('[data-nav-panel-body]');
    if (!host || !window.DATA) return;

    /* --col / --i are the only thing the open animation needs from here: the
       cascade itself is pure CSS (components.css, "contents flow down"), which
       keeps it out of the way of reduced motion and of the no-JS page. */
    host.innerHTML = window.DATA.PRODUCT_CATEGORIES.map(function (cat, col) {
      var items = window.DATA.products.filter(function (p) { return p.category === cat.id; });

      var links = items.map(function (p, i) {
        return '' +
          '<li>' +
            '<a class="nav-panel__item" href="#prod-' + esc(p.id) + '" style="--i:' + i + '">' +
              esc(p.menuName || p.name) +
            '</a>' +
          '</li>';
      }).join('');

      return '' +
        '<div class="nav-panel__col" style="--col:' + col + '">' +
          '<a class="nav-panel__cat" href="#cat-' + esc(cat.id) + '">' +
            '<span class="nav-panel__cat-num">' + esc(cat.num) + '</span>' +
            esc(cat.name) +
          '</a>' +
          (links
            ? '<ul class="nav-panel__list">' + links + '</ul>'
            : '<p class="nav-panel__empty">Nothing listed yet.</p>') +
        '</div>';
    }).join('');
  }

  function renderProducts() {
    var host = $('[data-products]');
    if (!host || !window.DATA) return;

    host.innerHTML = window.DATA.PRODUCT_CATEGORIES.map(function (cat) {
      var items = window.DATA.products.filter(function (p) { return p.category === cat.id; });

      var cards = items.length
        ? items.map(productCard).join('')
        : '<p class="u-muted">No products listed in this category yet.</p>';

      return '' +
        /* --count lets the stylesheet give each category a width in
           proportion to its cards, so all cards share one row on desktop. */
        '<div class="product-group section-anchor" id="cat-' + esc(cat.id) + '" data-spy ' +
             'style="--count:' + Math.max(items.length, 1) + '">' +
          '<div class="product-group__head" data-reveal>' +
            '<span class="index-num">' + esc(cat.num) + '</span>' +
            '<div>' +
              '<h3>' + esc(cat.name) + '</h3>' +
              '<p class="section-head__lead">' + esc(cat.lead) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="grid grid--3" data-reveal-group>' + cards + '</div>' +
        '</div>';
    }).join('');

    activate(host);
  }

  /* --------------------------------------------------------------------
     SHOP — DISTRIBUTORS
     -------------------------------------------------------------------- */

  /* One key/value row in a distributor card. Rows with no value are dropped
     entirely rather than printed as an empty line. */
  function distributorRow(iconName, label, valueHtml) {
    if (!valueHtml) return '';
    return '' +
      '<div class="distributor-card__row">' +
        '<span class="distributor-card__row-icon">' + icon(iconName, 'icon--sm') + '</span>' +
        '<div>' +
          '<span class="distributor-card__row-label">' + esc(label) + '</span>' +
          '<span class="distributor-card__row-value">' + valueHtml + '</span>' +
        '</div>' +
      '</div>';
  }

  /* Initials for the logo fallback — first letter of up to two words, so
     "CEBU VIS-MIN MARKETING CORP" reads as "CV" rather than a wall of letters. */
  function initials(name) {
    return (name || '').split(/\s+/).slice(0, 2).map(function (w) {
      return w.charAt(0);
    }).join('').toUpperCase();
  }

  /* Banner across the top of the card. The logos are square, full-bleed artwork
     carrying their own backgrounds, so they are cropped edge to edge rather than
     padded onto the card surface. */
  function distributorMedia(d) {
    var inner = d.logo
      ? '<img src="' + esc(d.logo) + '" alt="' + esc(d.name) + ' logo" ' +
        'loading="lazy" decoding="async" data-fade-in>'
      : '<span class="distributor-card__media-fallback">' + esc(initials(d.name)) + '</span>';

    return '<div class="distributor-card__media">' + inner + '</div>';
  }

  function distributorCard(d) {
    /* The distributor name is the link. Without a URL it stays plain text so
       we never render an <a> that goes nowhere. */
    var name = d.url
      ? '<a class="distributor-card__link" href="' + esc(d.url) + '" ' +
        'target="_blank" rel="noopener noreferrer">' + esc(d.name) +
          icon('external-link', 'icon--sm') + '</a>'
      : esc(d.name);

    var phone = d.phone
      ? (d.phoneHref
          ? '<a href="tel:' + esc(d.phoneHref) + '">' + esc(d.phone) + '</a>'
          : esc(d.phone))
      : '';

    var email = d.email
      ? '<a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a>'
      : '';

    return '' +
      '<article class="distributor-card" data-reveal data-spotlight data-tilt>' +
        distributorMedia(d) +
        '<div class="distributor-card__body">' +
          '<div class="distributor-card__head">' +
            '<div class="cluster cluster--sm">' +
              '<span class="tag tag--brand">' + esc(d.regionLabel) + '</span>' +
              (d.location ? '<span class="tag">' + esc(d.location) + '</span>' : '') +
            '</div>' +
            '<h4 class="distributor-card__name">' + name + '</h4>' +
          '</div>' +
          '<div class="distributor-card__rows">' +
            distributorRow('map-pin', 'Address', esc(d.address)) +
            distributorRow('phone', 'Contact No.', phone) +
            distributorRow('mail', 'Email', email) +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderDistributors() {
    var host = $('[data-distributors]');
    if (!host || !window.DATA) return;

    var region = (window.DATA.DISTRIBUTOR_REGIONS.filter(function (r) {
      return r.id === distributorState.region;
    })[0] || {});

    var list = window.DATA.distributors.filter(function (d) {
      return d.region === distributorState.region;
    });

    host.innerHTML = list.length
      ? '<div class="grid grid--3" data-reveal-group>' +
          list.map(distributorCard).join('') +
        '</div>'
      : '<div class="empty-state" data-reveal>' +
          icon('map-pin', 'icon--xl') +
          '<p><strong>No FCC distributors in ' + esc(region.label || 'this area') +
            ' at the moment.</strong></p>' +
          '<p class="u-muted">We are working on it. In the meantime, get in touch and ' +
            'we will point you to the nearest outlet.</p>' +
          '<p class="u-muted">Interested in becoming an FCC distributor in ' +
            esc(region.label || 'this area') + '? Contact us — we would love to hear ' +
            'from you.</p>' +
          '<a class="btn btn--ghost btn--sm" href="#contact" data-inquiry="distributor">' +
            'Become a distributor' + icon('arrow-right', 'icon--sm') + '</a>' +
        '</div>';

    var countHost = $('[data-distributors-count]');
    if (countHost) {
      countHost.textContent = list.length +
        (list.length === 1 ? ' distributor' : ' distributors');
    }

    activate(host);
  }

  function initDistributorFilters() {
    var bar = $('[data-distributors-filter]');
    if (!bar || !window.DATA) return;

    bar.innerHTML = window.DATA.DISTRIBUTOR_REGIONS.map(function (r) {
      return '<button type="button" class="filter-chip" data-filter="' + esc(r.id) + '" ' +
             'aria-pressed="' + (r.id === distributorState.region ? 'true' : 'false') + '">' +
             esc(r.label) + '</button>';
    }).join('') + '<span class="filter-count" data-distributors-count aria-live="polite"></span>';

    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;

      distributorState.region = chip.getAttribute('data-filter');

      Array.prototype.forEach.call(bar.querySelectorAll('[data-filter]'), function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });

      renderDistributors();
    });
  }

  /* --------------------------------------------------------------------
     EVENTS
     -------------------------------------------------------------------- */

  function eventCard(ev) {
    var d = formatDate(ev.date);
    var catLabel = (window.DATA.EVENT_FILTERS.filter(function (f) {
      return f.id === ev.category;
    })[0] || {}).label || ev.category;

    return '' +
      '<article class="card event-card" data-reveal>' +
        '<div class="card__media aspect-16-9">' +
          media(ev.image, ev.image ? ev.title : 'events/' + ev.id + '.jpg · 16:9', 'aspect-16-9') +
          '<span class="event-card__date"><strong>' + esc(d.day) + '</strong>' +
            '<span>' + esc(d.month) + ' ' + esc(d.year) + '</span></span>' +
        '</div>' +
        '<div class="card__body">' +
          '<div class="cluster cluster--sm">' +
            '<span class="tag tag--brand">' + esc(catLabel) + '</span>' +
            (ev.location ? '<span class="tag">' + esc(ev.location) + '</span>' : '') +
          '</div>' +
          '<h4 class="card__title">' + esc(ev.title) + '</h4>' +
          '<p class="card__text clamp-2">' + esc(ev.excerpt) + '</p>' +
          '<div class="card__foot">' +
            '<span class="link-arrow">Read more' + icon('arrow-right', 'icon--sm') + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* --------------------------------------------------------------------
     The lead event, as an editorial split: the photo album in a framed
     stage on one side, its copy and controls on the other.

     One frame per album entry is stacked in the stage, only the active one
     visible, and one dot per photo under the copy. Every slide is in the
     DOM at once, so stepping is a class swap — no layout thrash, and no
     network wait once the album has been through it.

     See .showcase in sections.css for the frame.
     -------------------------------------------------------------------- */

  function eventShowcase(ev) {
    var d = formatDate(ev.date);

    /* `gallery` is the album; an event carrying only a single `image` gets
       the same treatment, minus the dots. */
    var shots = (ev.gallery && ev.gallery.length)
      ? ev.gallery
      : (ev.image ? [ev.image] : []);
    var total = shots.length;

    var slides = shots.map(function (src, i) {
      return '<img src="' + esc(src) + '" ' +
             'alt="' + esc(ev.title) + ' — photo ' + (i + 1) + ' of ' + total + '" ' +
             'class="showcase__slide' + (i === 0 ? ' is-active' : '') + '" ' +
             'data-gallery-slide ' +
             /* The opening frame is the ground the headline sits on — it must
                not wait for a lazy pass or the section paints flat navy. */
             (i === 0 ? 'fetchpriority="high" ' : 'loading="lazy" ') +
             'decoding="async">';
    }).join('');

    var dots = shots.map(function (_, i) {
      return '<button type="button" ' +
             'class="showcase__dot' + (i === 0 ? ' is-active' : '') + '" ' +
             'data-gallery-go="' + i + '" ' +
             'aria-label="Show photo ' + (i + 1) + ' of ' + total + '"' +
             (i === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');

    /* `caption` is an array shown as separate lines; an event without one
       falls back to its single-paragraph excerpt. */
    var caption = (ev.caption && ev.caption.length)
      ? ev.caption
      : (ev.excerpt ? [ev.excerpt] : []);

    /* A single-photo showcase has nothing to step through, so it gets no
       controls at all rather than one inert dot. */
    var controls = total > 1
      ? '<div class="showcase__controls" data-reveal>' +
          '<button type="button" class="showcase__nav showcase__nav--prev" ' +
                  'data-gallery-step="-1" aria-label="Previous photo">' +
            icon('chevron-right') +
          '</button>' +
          '<div class="showcase__dots">' + dots + '</div>' +
          '<button type="button" class="showcase__nav showcase__nav--next" ' +
                  'data-gallery-step="1" aria-label="Next photo">' +
            icon('chevron-right') +
          '</button>' +
          '<span class="showcase__counter u-mono" data-gallery-counter aria-live="polite">' +
            '1 / ' + total +
          '</span>' +
        '</div>'
      : '';

    var meta = [d.full, ev.location].filter(Boolean).map(esc).join(' · ');

    return '' +
      '<article class="showcase" data-gallery ' +
              'role="group" aria-roledescription="carousel" ' +
              'aria-label="' + esc(ev.title) + ' photo album">' +

        /* data-reveal="clip": the album wipes open from the left as it
           scrolls in (the clip lands on each frame, never the stage). */
        '<div class="showcase__stage" data-reveal="clip">' +
          slides +
          '<span class="showcase__scrim" aria-hidden="true"></span>' +
        '</div>' +

        /* One group for the whole copy column, so the label, heading, rule,
           caption and controls arrive as a single staggered cascade. The
           section's own <h2> lives in its numbered head in index.html, so the
           featured event is an <h3>. */
        '<div class="showcase__inner" data-reveal-group>' +
          '<div class="showcase__copy">' +
            '<p class="label label--dot" data-reveal>Featured event</p>' +
            /* data-split-lines needs data-reveal beside it — the masked lines
               are released by .is-revealed. */
            '<h3 class="showcase__title" id="events-feature-title" data-reveal data-split-lines>' +
              esc(ev.title) +
            '</h3>' +
            (ev.subtitle
              ? '<p class="showcase__subtitle" data-reveal>' + esc(ev.subtitle) + '</p>'
              : '') +
            '<hr class="rule-accent showcase__rule" data-draw>' +
            '<div class="showcase__caption">' +
              caption.map(function (line) {
                return '<p data-reveal>' + esc(line) + '</p>';
              }).join('') +
            '</div>' +
            (meta ? '<p class="showcase__meta u-mono" data-reveal>' + meta + '</p>' : '') +
          '</div>' +

          controls +
        '</div>' +
      '</article>';
  }

  /* The stepping engine reads data attributes, not classes, so the showcase
     and any future gallery can share it without agreeing on a class name. */
  function showSlide(gallery, next) {
    var slides = [].slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
    var dots   = [].slice.call(gallery.querySelectorAll('[data-gallery-go]'));
    if (!slides.length) return;

    /* Wrap around at both ends */
    next = (next % slides.length + slides.length) % slides.length;

    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === next); });
    dots.forEach(function (t, i) {
      var on = i === next;
      t.classList.toggle('is-active', on);
      if (on) { t.setAttribute('aria-current', 'true'); }
      else    { t.removeAttribute('aria-current'); }
    });

    var counter = gallery.querySelector('[data-gallery-counter]');
    if (counter) counter.textContent = (next + 1) + ' / ' + slides.length;
  }

  function currentSlide(gallery) {
    var slides = [].slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
    var current = 0;
    slides.forEach(function (s, i) { if (s.classList.contains('is-active')) current = i; });
    return current;
  }

  /* One delegated listener for every gallery — survives re-renders because it
     is bound to the document, not to the injected nodes. */
  function initEventGallery() {
    document.addEventListener('click', function (e) {
      var control = e.target.closest('[data-gallery-step], [data-gallery-go]');
      if (!control) return;

      var gallery = control.closest('[data-gallery]');
      if (!gallery) return;

      var next;
      if (control.hasAttribute('data-gallery-go')) {
        next = parseInt(control.getAttribute('data-gallery-go'), 10) || 0;
      } else {
        next = currentSlide(gallery) +
               (parseInt(control.getAttribute('data-gallery-step'), 10) || 0);
      }
      showSlide(gallery, next);
    });

    /* Swipe — the arrows are small targets on a phone and a photo that
       ignores a drag reads as broken. Bound to the gallery itself rather
       than the photo stage: in the showcase the copy sits on top of the
       stage, so a drag across the headline must count too. Passive
       listeners — the gesture only steps the gallery, it never blocks the
       page from scrolling. */
    var swipe = null;

    document.addEventListener('touchstart', function (e) {
      var gallery = e.target.closest && e.target.closest('[data-gallery]');
      swipe = (gallery && e.touches.length === 1)
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, gallery: gallery }
        : null;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!swipe) return;
      var start = swipe;
      swipe = null;

      var touch = e.changedTouches[0];
      var dx = touch.clientX - start.x;
      var dy = touch.clientY - start.y;
      /* Ignore short drags, and anything closer to a vertical scroll */
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      showSlide(start.gallery, currentSlide(start.gallery) + (dx < 0 ? 1 : -1));
    }, { passive: true });

    document.addEventListener('touchcancel', function () { swipe = null; }, { passive: true });
  }

  function filteredEvents() {
    if (eventState.filter === 'all') return window.DATA.events.slice();
    return window.DATA.events.filter(function (e) { return e.category === eventState.filter; });
  }

  /* The showcase is pinned to the lead event and deliberately does NOT
     follow the category filter. Filters only ever change the archive grid
     below it. */
  function renderEventShowcase() {
    var host = $('[data-events-showcase]');
    if (!host || !window.DATA) return;

    var lead = window.DATA.events[0];
    host.innerHTML = lead ? eventShowcase(lead) : '';
    activate(host);
  }

  function renderEvents() {
    var archive   = $('[data-events-archive]');
    var gridHost  = $('[data-events-grid]');
    var moreBtn   = $('[data-events-more]');
    var countHost = $('[data-events-count]');
    if (!gridHost || !window.DATA) return;

    /* index 0 is the showcase above; the archive is everything after it */
    var lead = window.DATA.events[0];
    var rest = filteredEvents().filter(function (e) { return e !== lead; });

    if (archive) archive.hidden = window.DATA.events.length < 2;

    var visible = rest.slice(0, eventState.shown);

    gridHost.innerHTML = visible.length
      ? visible.map(eventCard).join('')
      : '<p class="u-muted empty-state">No items in this category yet. ' +
        'Add one in <code>js/data.js</code>.</p>';

    if (countHost) {
      countHost.textContent = rest.length + (rest.length === 1 ? ' item' : ' items');
    }

    if (moreBtn) {
      moreBtn.hidden = rest.length <= eventState.shown;
    }

    activate(gridHost);
  }

  function initEventFilters() {
    var bar = $('[data-events-filter]');
    if (!bar || !window.DATA) return;

    bar.innerHTML = window.DATA.EVENT_FILTERS.map(function (f, i) {
      return '<button type="button" class="filter-chip" data-filter="' + esc(f.id) + '" ' +
             'aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(f.label) + '</button>';
    }).join('') + '<span class="filter-count" data-events-count aria-live="polite"></span>';

    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;

      eventState.filter = chip.getAttribute('data-filter');
      eventState.shown = EVENTS_PER_PAGE;

      Array.prototype.forEach.call(bar.querySelectorAll('[data-filter]'), function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });

      renderEvents();
    });

    var moreBtn = $('[data-events-more]');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        eventState.shown += EVENTS_PER_PAGE;
        renderEvents();
      });
    }
  }

  /* --------------------------------------------------------------------
     CAREERS
     -------------------------------------------------------------------- */

  function jobRow(job) {
    var panelId = 'job-' + esc(job.id);

    var list = function (title, items) {
      if (!items || !items.length) return '';
      return '<div class="job-row__col">' +
               '<h5 class="job-row__subhead">' + esc(title) + '</h5>' +
               '<ul class="bullet-list">' +
                 items.map(function (i) {
                   return '<li>' + icon('check', 'icon--sm') + '<span>' + esc(i) + '</span></li>';
                 }).join('') +
               '</ul>' +
             '</div>';
    };

    return '' +
      '<div class="job-row accordion__item" data-reveal>' +
        '<button type="button" class="job-row__trigger accordion__trigger" ' +
                'aria-expanded="false" aria-controls="' + panelId + '" data-accordion>' +
          '<span class="job-row__main">' +
            '<span class="job-row__title">' + esc(job.title) + '</span>' +
            '<span class="job-row__meta">' +
              '<span class="tag">' + esc(job.location) + '</span>' +
              '<span class="tag">' + esc(job.type) + '</span>' +
            '</span>' +
          '</span>' +
          icon('plus') +
        '</button>' +
        '<div class="accordion__panel" id="' + panelId + '" hidden>' +
          '<div class="job-row__detail">' +
            list('Responsibilities', job.responsibilities) +
            list('Qualifications', job.qualifications) +
          '</div>' +
          '<a class="btn btn--primary btn--sm" href="#contact" ' +
             'data-apply="' + esc(job.title) + '">Apply for this role' +
             icon('arrow-right', 'icon--sm') + '</a>' +
        '</div>' +
      '</div>';
  }

  function renderJobs() {
    var host = $('[data-jobs]');
    if (!host || !window.DATA) return;

    /* No vacancies: the Careers banner's "Send your CV" carries the section,
       so the whole list block stays out of the way. */
    var block = host.closest('[data-jobs-block]');
    if (block) block.hidden = !window.DATA.jobs.length;

    var list = jobState.filter === 'all'
      ? window.DATA.jobs
      : window.DATA.jobs.filter(function (j) { return j.department === jobState.filter; });

    host.innerHTML = list.length
      ? '<div class="accordion">' + list.map(jobRow).join('') + '</div>'
      : '<div class="empty-state" data-reveal>' +
          icon('briefcase', 'icon--xl') +
          '<p><strong>' + (window.DATA.jobs.length
            ? 'No open positions in this department right now.'
            : 'No open positions right now.') + '</strong></p>' +
          '<p class="u-muted">We are always glad to hear from skilled people. Send us your CV ' +
            'and we will keep it on file for future openings.</p>' +
          '<a class="btn btn--ghost btn--sm" href="#contact" data-inquiry="careers">Send your CV' +
            icon('arrow-right', 'icon--sm') + '</a>' +
        '</div>';

    var countHost = $('[data-jobs-count]');
    if (countHost) {
      countHost.textContent = list.length +
        (list.length === 1 ? ' open position' : ' open positions');
    }

    activate(host);
  }

  function initJobFilters() {
    var bar = $('[data-jobs-filter]');
    if (!bar || !window.DATA) return;

    /* Department chips over a "no openings" state are filters for nothing. */
    if (!window.DATA.jobs.length) {
      bar.hidden = true;
      return;
    }

    bar.innerHTML = window.DATA.JOB_FILTERS.map(function (f, i) {
      return '<button type="button" class="filter-chip" data-filter="' + esc(f.id) + '" ' +
             'aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(f.label) + '</button>';
    }).join('') + '<span class="filter-count" data-jobs-count aria-live="polite"></span>';

    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;

      jobState.filter = chip.getAttribute('data-filter');

      Array.prototype.forEach.call(bar.querySelectorAll('[data-filter]'), function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });

      renderJobs();
    });
  }

  /* --------------------------------------------------------------------
     FAQ
     -------------------------------------------------------------------- */

  function renderFaq() {
    var host = $('[data-faq]');
    if (!host || !window.DATA) return;

    var block = host.closest('[data-faq-block]');
    if (block) block.hidden = !window.DATA.faq.length;

    host.innerHTML = window.DATA.faq.map(function (item, i) {
      var panelId = 'faq-panel-' + i;
      return '' +
        '<div class="accordion__item" data-reveal>' +
          '<button type="button" class="accordion__trigger" aria-expanded="false" ' +
                  'aria-controls="' + panelId + '" data-accordion>' +
            '<span>' + esc(item.q) + '</span>' + icon('plus') +
          '</button>' +
          '<div class="accordion__panel" id="' + panelId + '" hidden>' +
            '<p>' + esc(item.a) + '</p>' +
          '</div>' +
        '</div>';
    }).join('');

    activate(host);
  }

  /* --------------------------------------------------------------------
     Home teaser — the product rail under the hero

     One card per product, in data.js order. The whole card is a single link
     down to that product's full entry in section 03, so everything inside it
     is a span or a heading — no nested interactive element — and the pill and
     arrow at the bottom are decoration, not separate controls.

     Ground tint and ink colour are assigned by :nth-child in sections.css,
     not from data.js: the palette is a design decision, not content.
     -------------------------------------------------------------------- */

  function railCard(p, i) {
    var cat = null;
    (window.DATA.PRODUCT_CATEGORIES || []).forEach(function (c) {
      if (c.id === p.category) cat = c;
    });

    /* menuName exists precisely because the full names run to three
       slash-separated variants — far too long for a card this size. */
    var title = p.menuName || p.name;
    var num   = (i + 1 < 10 ? '0' : '') + (i + 1);

    /* The card's place in the row, as a custom property. Pinned, css/scroll-fx.css
       needs it twice: to work out how far off the right of the screen this
       particular card starts its entrance, and to stagger when that entrance
       runs. It is a position, not a style — the only thing about a card the
       stylesheet cannot see for itself, since nth-child cycles and the row is
       as long as DATA.products is. */
    var order = ' style="--i:' + i + '"';

    return '' +
      '<a class="pcard theme-light" href="#prod-' + esc(p.id) + '" ' +
         'data-prail-card data-reveal="right"' + order + '>' +

        /* Decorative: the accessible name of the link is the title and
           summary below, so repeating the product name in alt would make a
           screen reader say it twice. */
        '<span class="pcard__art" aria-hidden="true">' +
          (p.image
            ? '<img src="' + esc(p.image) + '" alt="" loading="lazy" ' +
              'decoding="async" data-fade-in data-prail-art>'
            : '') +
        '</span>' +

        '<div class="pcard__inner">' +
          '<div class="pcard__top">' +
            '<span class="pcard__num">' + esc(num) + '</span>' +
            (cat ? '<span class="pcard__chip">' + esc(cat.name) + '</span>' : '') +
          '</div>' +

          '<h3 class="pcard__title">' + esc(title) + '</h3>' +

          '<div class="pcard__body">' +
            '<p class="pcard__text">' + esc(p.summary) + '</p>' +

            /* The label is in the DOM and in the accessibility tree at every
               width — only its BOX collapses, so the pill reads as a circle
               until the card opens. */
            '<span class="pcard__actions" aria-hidden="true">' +
              '<span class="pcard__cta">' +
                icon('layers', 'icon--sm') +
                '<span class="pcard__cta-label">View specifications</span>' +
              '</span>' +
              '<span class="pcard__go">' + icon('arrow-right', 'icon--sm') + '</span>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function renderHomeProducts() {
    var host = $('[data-home-products]');
    if (!host || !window.DATA) return;

    host.innerHTML =
      '<div class="prail__track" data-prail-track data-reveal-group>' +
        window.DATA.products.map(railCard).join('') +
      '</div>';

    /* The PARENT, not the host: the track carries [data-reveal-group] and
       Motion.observe() searches inside the node it is given — it never matches
       that node itself. Passing the host would leave the group unobserved and
       every card stuck at opacity 0. */
    activate(host.parentNode || host);
  }

  /* --------------------------------------------------------------------
     PARTNER — distributor logo strip and network count

     The strip is a marquee: the logo set is written out twice and the
     track slides left by exactly one set (-50%), so the loop has no seam.
     With only a handful of distributors one set is narrower than a wide
     screen, so the set itself is repeated until it is comfortably wider.
     The second copy is aria-hidden — a screen reader hears the list once.
     Reduced motion stops the slide in CSS and the strip just wraps.
     -------------------------------------------------------------------- */

  function renderPartnerLogos() {
    var host = $('[data-partner-logos]');
    if (!host || !window.DATA) return;

    var withLogo = window.DATA.distributors.filter(function (d) { return d.logo; });
    if (!withLogo.length) { host.hidden = true; return; }

    var tile = function (d, hidden) {
      return '<li class="logo-strip__item"' + (hidden ? ' aria-hidden="true"' : '') + '>' +
               '<img src="' + esc(d.logo) + '" alt="' + (hidden ? '' : esc(d.name)) + '" ' +
               'width="600" height="600" loading="lazy" decoding="async">' +
             '</li>';
    };

    var repeat = Math.max(1, Math.ceil(8 / withLogo.length));
    var set = [];
    for (var r = 0; r < repeat; r++) set = set.concat(withLogo);

    host.innerHTML =
      '<ul class="logo-strip__track" role="list">' +
        set.map(function (d, i) { return tile(d, i >= withLogo.length); }).join('') +
        set.map(function (d) { return tile(d, true); }).join('') +
      '</ul>';
  }

  /* Counters read their target from data-count-to, so the distributor total
     is written there before Motion.init() registers it — the number then
     follows data.js without anyone touching the HTML. */
  function renderNetworkCount() {
    if (!window.DATA) return;
    var total = window.DATA.distributors.length;
    var regions = {};
    window.DATA.distributors.forEach(function (d) { regions[d.region] = true; });

    Array.prototype.forEach.call(document.querySelectorAll('[data-distributor-total]'), function (el) {
      el.setAttribute('data-count-to', String(total));
      el.textContent = String(total);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-region-total]'), function (el) {
      el.textContent = String(Object.keys(regions).length);
    });
  }

  /* --------------------------------------------------------------------
     Home teaser — two most recent events
     -------------------------------------------------------------------- */

  function renderHomeEvents() {
    var host = $('[data-home-events]');
    if (!host || !window.DATA) return;
    host.innerHTML = window.DATA.events.slice(0, 2).map(eventCard).join('');
    activate(host);
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    if (!window.DATA) return;

    renderHomeProducts();
    renderHomeEvents();
    renderNavPanel();
    renderProducts();

    initDistributorFilters();
    renderDistributors();

    initEventFilters();
    initEventGallery();
    renderEventShowcase();
    renderEvents();

    initJobFilters();
    renderJobs();

    renderFaq();

    renderPartnerLogos();
    renderNetworkCount();
  }

  return { init: init, esc: esc, icon: icon };
})();
