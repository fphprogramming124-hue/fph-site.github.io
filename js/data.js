/* ==========================================================================
   data.js — ALL editable site content
   --------------------------------------------------------------------------
   This is the file you edit to update the website. Everything below is
   PLACEHOLDER content marked with TODO. Replace the values with real ones;
   you never need to touch the HTML or CSS to add, remove or reorder items.

   Search this project for "TODO" to find every outstanding item.

   The ONLY real, verified content on this site is the company profile in
   index.html (name, address, business content, established date,
   investment ratio, fiscal year, employee count). Everything here is not.
   ========================================================================== */

window.DATA = (function () {
  'use strict';

  /* ======================================================================
     PRODUCTS
     ----------------------------------------------------------------------
     Grouped by category. To add a product, copy one object and change the
     values. `category` MUST match one of the ids in PRODUCT_CATEGORIES below
     or the card will not appear anywhere.

     Example of a fully-filled record:
       {
         id:       'sc-04',                         // unique, lowercase, no spaces
         category: 'scooter',                       // must match a category id
         partNo:   'FCC-2W-1043',                   // optional; mono line above the name
         name:     'Weight Roller Set',
         menuName: 'Weight Roller',                 // optional; short label for the
                                                    // header Products flyout, which
                                                    // has no room for the full name.
                                                    // Omit and `name` is used.
         summary:  'One or two sentences for the card.',
         tags:     ['CVT', 'Wear Part'],            // small chips on the card
         image:    'assets/img/products/scooter-item4.webp', // leave '' to show a placeholder
         specs: [                                   // rows in the expand panel
           ['Function',                'What the part does'],
           ['Wear point',              'Where it wears'],
           ['Recommended replacement', 'Every 20,000 km']
         ]
       }
     ====================================================================== */

  var PRODUCT_CATEGORIES = [
    {
      id: 'scooter',
      num: '01',
      name: 'Scooter',
      lead: 'CVT drive-line parts for automatic scooters — the clutch weight, drive face and driven pulley that carry engine power from the crankshaft to the rear wheel.'
    },
    {
      id: 'sport',
      num: '02',
      name: 'Sport',
      lead: 'Multi-plate clutch discs for manual sport models, transmitting engine power to the tire through the clutch plate.'
    }
  ];

  var products = [
    /* ---- Scooter ---- */
    {
      id: 'sc-01', category: 'scooter',
      name: 'Clutch Weight',
      menuName: 'Clutch Weight',
      summary: 'Transmits the engine torque to the tires through the outer clutch. Because it rubs against the outer clutch every time the scooter starts off, the clutch weight is a regular replacement part.',
      tags: ['CVT', 'Wear Part'],
      image: 'assets/img/products/scooter-item1.webp',
      specs: [
        ['Function', 'Transmits engine torque to the tires through the outer clutch'],
        ['Wear point', 'Friction surface against the outer clutch — rubs on every start'],
        ['If left worn', 'Deterioration of starting performance and of fuel consumption'],
        ['Recommended replacement', 'Every 20,000 km']
      ]
    },
    {
      id: 'sc-02', category: 'scooter',
      name: 'Centrifugal Drive Face / Centrifugal Movable Drive Face',
      menuName: 'Drive Face',
      summary: 'Transmits the power of the engine to the drive plate assembly through the belt. The movable drive face moves according to the engine speed to adjust speed.',
      tags: ['CVT', 'Wear Part'],
      image: 'assets/img/products/scooter-item2.webp',
      specs: [
        ['Function', 'Transmits engine power to the drive plate assembly through the belt'],
        ['Speed adjustment', 'The movable drive face moves according to engine speed'],
        ['Wear points', 'Belt sliding surface; weight-roller rolling surface on the back of the movable drive face'],
        ['If left worn', 'Engine power is harder to transmit — deterioration of fuel consumption'],
        ['Recommended replacement', 'Every 20,000 km']
      ]
    },
    {
      id: 'sc-03', category: 'scooter',
      name: 'Centrifugal Pulley Assy Driven / Centrifugal Face Comp Driven / Face Comp Movable Driven',
      menuName: 'Pulley Assy Driven',
      summary: 'Receives engine power from the belt and transmits it to the drive plate assembly. The belt sliding surface wears with constant use.',
      tags: ['CVT', 'Wear Part'],
      image: 'assets/img/products/scooter-item3.webp',
      specs: [
        ['Function', 'Receives engine power from the belt and transmits it to the drive plate assembly'],
        ['Wear points', 'Belt sliding surface; sliding surfaces of the movable driven face and boss'],
        ['If left worn', 'Engine power is harder to transmit, fuel consumption deteriorates and shifting is no longer smooth'],
        ['Recommended replacement', 'Every 20,000 km']
      ]
    },

    /* ---- Sport ---- */
    {
      id: 'sp-01', category: 'sport',
      name: 'Multi-plate Disc (Paper) / Multi-disc (Cork)',
      menuName: 'Multi-plate Disc',
      summary: 'Connects the power of the engine to the tire through the clutch plate. Wear makes the engine power harder to transmit and leads to deterioration of fuel consumption.',
      tags: ['Paper', 'Cork', 'Wear Part'],
      image: 'assets/img/products/sport-item1.webp',
      specs: [
        ['Function', 'Connects engine power to the tire through the clutch plate'],
        ['Friction material', 'Paper base / cork'],
        ['If left worn', 'Engine power is harder to transmit — deterioration of fuel consumption'],
        ['Recommended replacement', 'Every 20,000 km']
      ]
    }
  ];

  /* ======================================================================
     SHOP — FPH DISTRIBUTORS
     ----------------------------------------------------------------------
     Grouped by island group. `region` MUST match one of the ids in
     DISTRIBUTOR_REGIONS below or the card will not appear anywhere.

     Field notes:
       regionLabel — the administrative region, shown as a chip ("NCR", "REGION 7")
       logo        — square logo, shown as the banner across the top of the card
                     (cropped to 3:2) and in the Partner section's logo strip.
                     Web copies live in assets/img/distributors/ (600px WebP);
                     the original PNGs are kept in Distributors/. Leave '' and
                     the banner falls back to the distributor's initials.
       url         — the distributor's website or Facebook page. The name on the
                     card becomes a link to it. Leave '' for no link.
       phoneHref   — the dialable form of `phone`, in +63 international format.
                     Written out by hand because numbers like
                     "(02) 83678911 to 13" cannot be derived automatically.
                     Leave '' and the number renders as plain text.
       email       — leave '' when the distributor has none on file.

     An island group with no distributors shows a proper empty state — just
     leave it out of the list below.
     ====================================================================== */

  var DISTRIBUTOR_REGIONS = [
    { id: 'luzon',    label: 'Luzon' },
    { id: 'visayas',  label: 'Visayas' },
    { id: 'mindanao', label: 'Mindanao' }
  ];

  var distributors = [
    /* ---- Luzon ---- */
    {
      id: 'dist-01', region: 'luzon', regionLabel: 'NCR',
      name: 'PHILIPPINE SUNTAL CORP.',
      logo: 'assets/img/distributors/philippine-suntal-corp.webp',
      url: 'https://www.facebook.com/SuntalProducts',
      location: 'Caloocan',
      address: '127 A. Del Mundo Street, Grace Park West, Caloocan City',
      phone: '(02) 83678911 to 13',
      phoneHref: '+63283678911',
      email: 'sales@philsuntalcorp.com'
    },
    {
      id: 'dist-02', region: 'luzon', regionLabel: 'NCR',
      name: 'CYCLEMAR CALOOCAN CORP.',
      logo: 'assets/img/distributors/cyclemar-caloocan-corp.webp',
      url: 'https://www.facebook.com/CycleMarCorporationPhilippines',
      location: 'Caloocan',
      address: '336 10th Avenue, Caloocan City',
      phone: '(0925) 8787002',
      phoneHref: '+639258787002',
      email: ''
    },

    /* ---- Visayas ---- */
    {
      id: 'dist-04', region: 'visayas', regionLabel: 'REGION 7',
      name: 'CEBU VIS-MIN MARKETING CORP',
      logo: 'assets/img/distributors/cebu.webp',
      url: 'https://www.vismingroup.com/',
      location: 'Cebu',
      address: 'C. Cuizon Street, Barangay Tinago, Cebu City',
      phone: '(0908) 8128432',
      phoneHref: '+639088128432',
      email: ''
    },

    /* ---- Mindanao ---- */
    {
      id: 'dist-03', region: 'mindanao', regionLabel: 'REGION 10',
      name: 'KING MOTORS',
      logo: 'assets/img/distributors/king-motors.webp',
      url: 'https://www.facebook.com/kingmotorscdoc',
      location: 'Cagayan de Oro',
      address: 'Catimco Building, Osmena Street, Cagayan de Oro City',
      phone: '(0917) 677 1234',
      phoneHref: '+639176771234',
      email: ''
    }
  ];

  /* ======================================================================
     EVENTS & NEWS
     ----------------------------------------------------------------------
     `date` must be YYYY-MM-DD so it sorts and formats correctly.
     `category` must match one of the EVENT_FILTERS ids below.
     Newest items should go at the top — the first one renders as the
     large featured item.
     ====================================================================== */

  var EVENT_FILTERS = [
    { id: 'all',       label: 'All' },
    { id: 'news',      label: 'Company News' },
    { id: 'community', label: 'Community' },
    { id: 'award',     label: 'Awards' },
    { id: 'plant',     label: 'Plant' }
  ];

  var events = [
    {
      /* The first entry is the album showcase that opens the Events section:
         it supplies the section heading, so this list must never be empty.
         `subtitle`, `caption` and `location` are only read by the showcase.
         `gallery` is the album — one dot is drawn per entry, and the first
         frame is the one you land on. `image` is the archive-card thumbnail
         and should match that first frame.

         Shots are the section background, cropped into the hero's own frame
         (object-fit: cover, min-height min(920px, 100svh)) — so a wide
         viewport trims the top and bottom of each one. Keep the subject near
         the middle-upper band of the frame; --showcase-focus in sections.css
         moves which band survives, for the whole album at once. */
      id: 'ev-00', date: '2026-08-08', category: 'community',
      title: 'FCC Racing Clinic',
      subtitle: 'FCC x TSR Championship',
      location: 'Carmona Racing Circuit',
      caption: [
        'A day on track at Carmona Racing Circuit with the FCC x TSR Championship.',
        'Thank you to every rider, partner and team member who joined us.',
        'Building rider confidence, sharing the thrill of the sport and growing the riding community.'
      ],
      excerpt: 'A day on track at Carmona Racing Circuit with the FCC x TSR Championship — building rider confidence and growing the riding community.',
      image: 'assets/img/events/fcc-racing-clinic-2954.jpg',
      /* Only files that exist belong here — every entry becomes a dot, so a
         missing file is a dot that shows nothing.

         These are 1600px web copies in assets/img/events/. The originals stay
         in featured_img/ (the camera files there are ~17MB each) and must
         never be referenced: this album loads on first paint. */
      gallery: [
        'assets/img/events/fcc-racing-clinic-2954.jpg',
        'assets/img/events/fcc-racing-clinic-3264.jpg',
        'assets/img/events/fcc-racing-clinic-4025.jpg',
        'assets/img/events/fcc-racing-clinic-8131.jpg',
        'assets/img/events/fcc-riding-clinic-57.jpg',
        'assets/img/events/fcc-riding-clinic-150.jpg',
        'assets/img/events/fcc-riding-clinic-220.jpg',
        'assets/img/events/fcc-riding-clinic-241.jpg',
        'assets/img/events/fcc-riding-clinic-242.jpg'
      ]
    }
  ];

  /* ======================================================================
     CAREERS — open positions
     ----------------------------------------------------------------------
     `department` must match one of the JOB_FILTERS ids.
     `responsibilities` and `qualifications` are plain arrays of strings —
     add or remove lines freely.
     ====================================================================== */

  var JOB_FILTERS = [
    { id: 'all',        label: 'All Departments' },
    { id: 'production',  label: 'Production' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'quality',     label: 'Quality' },
    { id: 'admin',       label: 'Administration' }
  ];

  /* TODO: add real vacancies here. While the list is empty the section shows
     a "no openings — send your CV" state and hides the department filter.

     Example:
       {
         id: 'job-01', department: 'engineering', title: 'Process Engineer',
         location: 'Biñan, Laguna', type: 'Full-time',
         responsibilities: ['…', '…'],
         qualifications:   ['…', '…']
       }
  */
  var jobs = [];

  /* ======================================================================
     CAREERS FAQ
     ====================================================================== */

  /* TODO: add real questions and answers. While this is empty the whole
     "Frequently asked" block is hidden.

     Example:
       { q: 'How do I apply for a position?',
         a: 'Email your CV to … with the role title in the subject line.' }
  */
  var faq = [];

  return {
    PRODUCT_CATEGORIES: PRODUCT_CATEGORIES,
    DISTRIBUTOR_REGIONS: DISTRIBUTOR_REGIONS,
    EVENT_FILTERS: EVENT_FILTERS,
    JOB_FILTERS: JOB_FILTERS,
    products: products,
    distributors: distributors,
    events: events,
    jobs: jobs,
    faq: faq
  };
})();
