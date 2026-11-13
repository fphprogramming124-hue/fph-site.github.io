/* ==========================================================================
   Icon sprite
   --------------------------------------------------------------------------
   All icons live in ONE inline <symbol> sprite injected at the top of <body>.
   Same-document references (<use href="#i-name">) work everywhere, including
   when the file is opened directly from Explorer. An external sprite.svg
   would NOT — that is why the sprite is a JS string rather than a file.

   Usage in markup:
     <svg class="icon" aria-hidden="true" focusable="false">
       <use href="#i-arrow-right"></use>
     </svg>

   Style spec: 24x24 viewBox, stroke-based, currentColor, 1.5 stroke width,
   round caps and joins. Line art that matches the technical-drawing motif and
   recolours itself automatically on navy or on white.

   TO ADD AN ICON: paste a new <symbol id="i-yourname" viewBox="0 0 24 24">
   into the template string below, using stroke="currentColor" fill="none".
   ========================================================================== */

(function () {
  'use strict';

  var SPRITE = [
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"',
    ' style="position:absolute;width:0;height:0;overflow:hidden" ',
    ' fill="none" stroke="currentColor" stroke-width="1.5"',
    ' stroke-linecap="round" stroke-linejoin="round">',

    /* --- navigation / chrome ------------------------------------------- */
    '<symbol id="i-menu" viewBox="0 0 24 24">',
      '<path d="M3 6h18M3 12h18M3 18h18"/>',
    '</symbol>',

    '<symbol id="i-close" viewBox="0 0 24 24">',
      '<path d="M6 6l12 12M18 6L6 18"/>',
    '</symbol>',

    '<symbol id="i-arrow-right" viewBox="0 0 24 24">',
      '<path d="M4 12h15M13 6l6 6-6 6"/>',
    '</symbol>',

    '<symbol id="i-arrow-up-right" viewBox="0 0 24 24">',
      '<path d="M7 17L17 7M8 7h9v9"/>',
    '</symbol>',

    '<symbol id="i-chevron-down" viewBox="0 0 24 24">',
      '<path d="M6 9l6 6 6-6"/>',
    '</symbol>',

    '<symbol id="i-chevron-right" viewBox="0 0 24 24">',
      '<path d="M9 6l6 6-6 6"/>',
    '</symbol>',

    /* --- status --------------------------------------------------------- */
    '<symbol id="i-check" viewBox="0 0 24 24">',
      '<path d="M4 12.5l5 5L20 6.5"/>',
    '</symbol>',

    '<symbol id="i-check-circle" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.7 2.7L16 9.5"/>',
    '</symbol>',

    '<symbol id="i-alert-circle" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.2"/>',
      '<circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none"/>',
    '</symbol>',

    /* --- contact -------------------------------------------------------- */
    '<symbol id="i-map-pin" viewBox="0 0 24 24">',
      '<path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"/>',
      '<circle cx="12" cy="10" r="2.6"/>',
    '</symbol>',

    '<symbol id="i-phone" viewBox="0 0 24 24">',
      '<path d="M5 3.5h3.2l1.6 4-2 1.4a12.5 12.5 0 007.3 7.3l1.4-2 4 1.6V19a1.9 1.9 0 01-2.1 1.9A16.6 16.6 0 013.1 5.6 1.9 1.9 0 015 3.5z"/>',
    '</symbol>',

    '<symbol id="i-mail" viewBox="0 0 24 24">',
      '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6.5l8.5 6 8.5-6"/>',
    '</symbol>',

    '<symbol id="i-printer" viewBox="0 0 24 24">',
      '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="1.5"/>',
      '<path d="M7 14h10v6.5H7z"/>',
    '</symbol>',

    '<symbol id="i-clock" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>',
    '</symbol>',

    '<symbol id="i-instagram" viewBox="0 0 24 24">',
      '<rect x="3" y="3" width="18" height="18" rx="5"/>',
      '<circle cx="12" cy="12" r="4"/>',
      '<path d="M16.9 7.1h.01"/>',
    '</symbol>',

    '<symbol id="i-calendar" viewBox="0 0 24 24">',
      '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    '</symbol>',

    /* --- company / industry --------------------------------------------- */
    '<symbol id="i-factory" viewBox="0 0 24 24">',
      '<path d="M3 21V10l5.5 3.5V10L14 13.5V7l7 4.2V21z"/><path d="M7 17.5h1.5M12 17.5h1.5M17 17.5h1.5"/>',
    '</symbol>',

    '<symbol id="i-gear" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="3.2"/>',
      '<path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>',
    '</symbol>',

    '<symbol id="i-clutch" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.3"/>',
      '<path d="M12 3v4.6M12 16.4V21M3 12h4.6M16.4 12H21M5.6 5.6l3.3 3.3M15.1 15.1l3.3 3.3M18.4 5.6l-3.3 3.3M8.9 15.1l-3.3 3.3"/>',
    '</symbol>',

    '<symbol id="i-shield-check" viewBox="0 0 24 24">',
      '<path d="M12 2.8l7 2.7v6c0 4.4-3 8.1-7 9.7-4-1.6-7-5.3-7-9.7v-6z"/><path d="M8.8 11.8l2.4 2.4 4-4.6"/>',
    '</symbol>',

    '<symbol id="i-target" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    '</symbol>',

    '<symbol id="i-layers" viewBox="0 0 24 24">',
      '<path d="M12 3l8.5 4.5L12 12 3.5 7.5z"/><path d="M3.5 12.2L12 16.7l8.5-4.5M3.5 16.6L12 21l8.5-4.4"/>',
    '</symbol>',

    '<symbol id="i-users" viewBox="0 0 24 24">',
      '<circle cx="9.5" cy="8" r="3.3"/><path d="M3 20a6.5 6.5 0 0113 0"/>',
      '<path d="M16 5.2a3.3 3.3 0 010 5.6M17.5 14.4A6.5 6.5 0 0121 20"/>',
    '</symbol>',

    '<symbol id="i-globe" viewBox="0 0 24 24">',
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>',
      '<path d="M12 3a14 14 0 010 18 14 14 0 010-18z"/>',
    '</symbol>',

    '<symbol id="i-award" viewBox="0 0 24 24">',
      '<circle cx="12" cy="9" r="5.5"/><path d="M8.4 13.6L7 21.5l5-2.6 5 2.6-1.4-7.9"/>',
    '</symbol>',

    '<symbol id="i-trending-up" viewBox="0 0 24 24">',
      '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    '</symbol>',

    '<symbol id="i-briefcase" viewBox="0 0 24 24">',
      '<rect x="3" y="7.5" width="18" height="12.5" rx="1.5"/>',
      '<path d="M8.5 7.5V5.5A1.5 1.5 0 0110 4h4a1.5 1.5 0 011.5 1.5v2M3 12.5h18"/>',
    '</symbol>',

    '<symbol id="i-heart" viewBox="0 0 24 24">',
      '<path d="M12 20.5S3.5 15.3 3.5 9.6A4.6 4.6 0 0112 7a4.6 4.6 0 018.5 2.6c0 5.7-8.5 10.9-8.5 10.9z"/>',
    '</symbol>',

    '<symbol id="i-book" viewBox="0 0 24 24">',
      '<path d="M4 4.5h6a3 3 0 013 3v12a2.4 2.4 0 00-2.4-2.4H4z"/>',
      '<path d="M20 4.5h-6a3 3 0 00-3 3v12a2.4 2.4 0 012.4-2.4H20z"/>',
    '</symbol>',

    '<symbol id="i-download" viewBox="0 0 24 24">',
      '<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4 19.5h16"/>',
    '</symbol>',

    '<symbol id="i-external-link" viewBox="0 0 24 24">',
      '<path d="M10.5 5H5.5A1.5 1.5 0 004 6.5v12A1.5 1.5 0 005.5 20h12a1.5 1.5 0 001.5-1.5v-5"/>',
      '<path d="M14 4h6v6M20 4l-8.5 8.5"/>',
    '</symbol>',

    '<symbol id="i-plus" viewBox="0 0 24 24">',
      '<path d="M12 5v14M5 12h14"/>',
    '</symbol>',

    /* --- social (footer) ------------------------------------------------ */
    '<symbol id="i-linkedin" viewBox="0 0 24 24">',
      '<rect x="3" y="3" width="18" height="18" rx="2"/>',
      '<path d="M7.5 10.5V17M7.5 7.3v.1M11.5 17v-3.6a2.1 2.1 0 014.2 0V17M11.5 10.5V17"/>',
    '</symbol>',

    '<symbol id="i-facebook" viewBox="0 0 24 24">',
      '<rect x="3" y="3" width="18" height="18" rx="2"/>',
      '<path d="M15 8h-1.6a1.9 1.9 0 00-1.9 1.9V21M9.8 13h4.6"/>',
    '</symbol>',

    '</svg>'
  ].join('');

  /* Injected as the FIRST child of <body> so any <use href="#i-..."> that
     follows can resolve it. Guarded so a double-include is harmless. */
  function inject() {
    if (document.getElementById('fcc-icon-sprite')) return;
    var wrap = document.createElement('div');
    wrap.id = 'fcc-icon-sprite';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    wrap.innerHTML = SPRITE;
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }

  window.FCC_ICON_SPRITE = SPRITE;
})();
