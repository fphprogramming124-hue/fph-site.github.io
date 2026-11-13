/* ==========================================================================
   service-check.js — "Is it time to replace?" interval checker
   --------------------------------------------------------------------------
   Drives the [data-service-check] form in the Products section. A rider
   picks scooter or sport, types their odometer (and, optionally, the reading
   when the parts were last changed and how far they ride a month), and gets
   one bar per wear part: how much of its interval is used, and roughly when
   it falls due.

   NOTHING IS HARD-CODED HERE. The parts are DATA.products for the chosen
   category, and each interval is read out of that product's own
   'Recommended replacement' spec row ("Every 20,000 km"). Change the
   interval in data.js and the checker follows; a product without one is
   simply left out.

   Results update as the visitor types — there is no submit step — and are
   announced through the results region's aria-live.

   Public API:  ServiceCheck.init()
   Global:      window.ServiceCheck
   ========================================================================== */

window.ServiceCheck = (function () {
  'use strict';

  var DUE_SOON = 0.8;    /* share of the interval at which "plan ahead" starts */

  function esc(v) {
    return window.Render ? window.Render.esc(v) : String(v == null ? '' : v);
  }
  function icon(name, cls) {
    return window.Render ? window.Render.icon(name, cls) : '';
  }

  function km(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' km';
  }

  /* "12,500", "12 500 km", "12500" all read as 12500. Empty is null. */
  function readKm(input) {
    var raw = String(input.value || '').replace(/[^\d.]/g, '');
    if (!raw) return null;
    var n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }

  function intervalOf(product) {
    var row = (product.specs || []).filter(function (r) {
      return /replacement/i.test(r[0]);
    })[0];
    var m = row && String(row[1]).match(/([\d,]+)\s*km/i);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
  }

  function partsFor(category) {
    if (!window.DATA) return [];
    return window.DATA.products
      .filter(function (p) { return p.category === category; })
      .map(function (p) { return { product: p, interval: intervalOf(p) }; })
      .filter(function (x) { return x.interval; });
  }

  function months(distance, perMonth) {
    if (!perMonth) return '';
    var m = distance / perMonth;
    if (m < 1) return ' — within the month';
    return ' — about ' + Math.round(m) + (Math.round(m) === 1 ? ' month' : ' months');
  }

  function row(part, used, perMonth) {
    var p = part.product;
    var share = used / part.interval;
    var left = part.interval - used;

    var state, label, note;
    if (share >= 1) {
      state = 'due';
      label = 'Due now';
      note = 'Past the ' + km(part.interval) + ' interval by ' + km(-left) + '.';
    } else if (share >= DUE_SOON) {
      state = 'soon';
      label = 'Plan ahead';
      note = 'Replace in ' + km(left) + months(left, perMonth) + '.';
    } else {
      state = 'ok';
      label = 'In range';
      note = km(left) + ' to go' + months(left, perMonth) + '.';
    }

    return '' +
      '<li class="svc-part svc-part--' + state + '">' +
        '<div class="svc-part__head">' +
          '<a class="svc-part__name" href="#prod-' + esc(p.id) + '">' + esc(p.menuName || p.name) + '</a>' +
          '<span class="svc-part__chip">' + label + '</span>' +
        '</div>' +
        /* The bar is decoration; the numbers beside it carry the meaning. */
        '<span class="svc-part__bar" aria-hidden="true">' +
          '<span class="svc-part__fill" style="--share:' + Math.min(share, 1).toFixed(3) + '"></span>' +
        '</span>' +
        '<p class="svc-part__note">' + km(used) + ' of ' + km(part.interval) + ' used. ' + note + '</p>' +
      '</li>';
  }

  function setup(form) {
    var out = form.querySelector('[data-service-results]');
    var error = form.querySelector('[data-service-error]');
    var odo = form.querySelector('[name="svc-odometer"]');
    var last = form.querySelector('[name="svc-last"]');
    var monthly = form.querySelector('[name="svc-monthly"]');
    if (!out || !odo) return;

    function category() {
      var picked = form.querySelector('[name="svc-type"]:checked');
      return picked ? picked.value : 'scooter';
    }

    function fail(message) {
      if (error) {
        error.innerHTML = icon('alert-circle', 'icon--sm') + '<span>' + esc(message) + '</span>';
        error.hidden = false;
      }
    }

    function update() {
      if (error) error.hidden = true;

      var now = readKm(odo);
      var since = last ? (readKm(last) || 0) : 0;
      var perMonth = monthly ? readKm(monthly) : null;
      var parts = partsFor(category());

      if (now === null) {
        out.innerHTML = '<p class="svc-empty">' + icon('gear', 'icon--lg') +
          '<span>Enter your odometer reading to see where each part stands.</span></p>';
        return;
      }
      if (since > now) {
        fail('The reading at the last replacement is higher than the odometer now. Check both numbers.');
        out.innerHTML = '';
        return;
      }
      if (!parts.length) {
        out.innerHTML = '<p class="svc-empty">No replacement interval is listed for these parts yet.</p>';
        return;
      }

      var used = now - since;
      var due = parts.filter(function (p) { return used >= p.interval; }).length;

      out.innerHTML =
        '<p class="svc-summary">' + (due
          ? '<strong>' + due + (due === 1 ? ' part is' : ' parts are') + ' due for replacement.</strong>'
          : '<strong>Your parts are within the recommended interval.</strong>') +
        '</p>' +
        '<ul class="svc-parts" role="list">' +
          parts.map(function (p) { return row(p, used, perMonth); }).join('') +
        '</ul>' +
        '<div class="cluster cluster--sm svc-actions">' +
          '<a class="btn btn--accent btn--sm" href="#shop">Find a distributor' +
            icon('arrow-right', 'icon--sm') + '</a>' +
          '<a class="btn btn--ghost btn--sm" href="#contact" data-inquiry="sales" ' +
             'data-subject="Replacement parts enquiry">Ask our team</a>' +
        '</div>';

      /* One frame at zero, then the real width — so the bars fill rather
         than appear. Skipped under reduced motion by the CSS override. */
      var fills = out.querySelectorAll('.svc-part__fill');
      Array.prototype.forEach.call(fills, function (f) { f.classList.add('is-start'); });
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          Array.prototype.forEach.call(fills, function (f) { f.classList.remove('is-start'); });
        });
      });
    }

    var pending = null;
    form.addEventListener('input', function () {
      window.clearTimeout(pending);
      pending = window.setTimeout(update, 180);
    });
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); update(); });

    update();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-service-check]'), setup);
  }

  return { init: init };
})();
