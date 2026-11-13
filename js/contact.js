/* ==========================================================================
   contact.js — contact form validation and submission

   HOW IT SENDS TODAY — mailto, honestly labelled.
   ----------------------------------------------------------------------------
   There is no mail server behind this site yet, so a valid submission opens
   the visitor's own email app with the enquiry already written out to
   SALES_EMAIL below. The confirmation says exactly that ("press Send"), and
   offers a copy-to-clipboard fallback for anyone without a mail app. Nothing
   is pretended: the earlier version showed "message received" and threw the
   enquiry away.

   TO SEND FROM THE SERVER INSTEAD, replace the body of submitForm() with one
   of these, and change showSuccess() back to a "received" message:

     1. A hosted form service (no server code needed):
          return fetch('https://formspree.io/f/YOUR_ID', {
            method: 'POST', body: new FormData(form),
            headers: { Accept: 'application/json' }
          }).then(function (r) { if (!r.ok) throw new Error('send failed'); });

     2. A PHP handler on the server — send.php next to index.html using the
        company SMTP account (PHPMailer), then:
          return fetch('send.php', { method: 'POST', body: new FormData(form) })
            .then(function (r) { if (!r.ok) throw new Error('send failed'); });

   DEEP LINKS — any link or button with data-inquiry="<option value>" (and an
   optional data-subject) jumps here with the enquiry type and subject filled
   in. Careers' "Apply for this role" buttons use data-apply, which does the
   same for a named role.
   ========================================================================== */

window.ContactForm = (function () {
  'use strict';

  var SALES_EMAIL = 'salesmarketingph@worldfcc.com';
  var MIN_MESSAGE_LENGTH = 20;

  /* Default subject lines for the deep links, by enquiry type */
  var SUBJECTS = {
    sales:       'Quotation request',
    distributor: 'Distributorship enquiry',
    careers:     'Job application',
    supplier:    'Supplier enquiry'
  };

  var lastEnquiry = '';

  /* Pragmatic, not RFC-complete. Full RFC 5322 validation rejects addresses
     people actually use and accepts ones they don't. */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var form, alertBox, successPanel;
  var touched = {};

  function $(sel, root) { return (root || document).querySelector(sel); }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false">' +
           '<use href="#i-' + name + '"></use></svg>';
  }

  /* --------------------------------------------------------------------
     Validation rules
     Each returns an error string, or '' when the value is acceptable.
     Messages must state the cause AND how to fix it.
     -------------------------------------------------------------------- */

  var RULES = {
    name: function (v) {
      if (!v.trim()) return 'Enter your full name.';
      if (v.trim().length < 2) return 'Enter your full name — at least 2 characters.';
      return '';
    },
    email: function (v) {
      if (!v.trim()) return 'Enter your email address so we can reply.';
      if (!EMAIL_RE.test(v.trim())) return 'That email address looks incomplete. Use the format name@company.com';
      return '';
    },
    phone: function (v) {
      if (!v.trim()) return '';   /* optional */
      if (!/^[0-9+()\-.\s]{7,}$/.test(v.trim())) {
        return 'Use digits, spaces and + ( ) - only, at least 7 characters.';
      }
      return '';
    },
    inquiry: function (v) {
      if (!v) return 'Choose the type of enquiry so we route it to the right team.';
      return '';
    },
    subject: function (v) {
      if (!v.trim()) return 'Enter a subject line.';
      if (v.trim().length < 3) return 'Enter a subject line of at least 3 characters.';
      return '';
    },
    message: function (v) {
      if (!v.trim()) return 'Enter your message.';
      if (v.trim().length < MIN_MESSAGE_LENGTH) {
        return 'Please add a little more detail — at least ' + MIN_MESSAGE_LENGTH +
               ' characters (currently ' + v.trim().length + ').';
      }
      return '';
    },
    consent: function (v, field) {
      if (!field.checked) return 'Please confirm you agree to be contacted about this enquiry.';
      return '';
    }
  };

  /* --------------------------------------------------------------------
     Field-level error display
     -------------------------------------------------------------------- */

  function fieldWrap(input) {
    return input.closest('.field');
  }

  function showError(input, message) {
    var wrap = fieldWrap(input);
    if (!wrap) return;

    var errorEl = $('.field__error', wrap);
    var errorId = input.id + '-error';

    if (message) {
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'field__error';
        errorEl.id = errorId;
        errorEl.setAttribute('role', 'alert');
        wrap.appendChild(errorEl);
      }
      errorEl.innerHTML = icon('alert-circle', 'icon--sm') + '<span>' + message + '</span>';
      errorEl.hidden = false;

      wrap.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');

      /* Preserve any existing describedby (hint text) alongside the error */
      var hint = $('.field__hint', wrap);
      input.setAttribute('aria-describedby',
        errorId + (hint && hint.id ? ' ' + hint.id : ''));
    } else {
      if (errorEl) errorEl.hidden = true;
      wrap.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');

      var h = $('.field__hint', wrap);
      if (h && h.id) input.setAttribute('aria-describedby', h.id);
      else input.removeAttribute('aria-describedby');
    }
  }

  function validateField(input, force) {
    var rule = RULES[input.name];
    if (!rule) return true;

    /* Do not scold a field the user has not finished with yet */
    if (!force && !touched[input.name]) return true;

    var message = rule(input.value, input);
    showError(input, message);
    return !message;
  }

  function fields() {
    return Array.prototype.slice.call(
      form.querySelectorAll('[name]')
    ).filter(function (el) {
      return RULES.hasOwnProperty(el.name);
    });
  }

  function validateAll() {
    var invalid = [];
    fields().forEach(function (input) {
      if (!validateField(input, true)) invalid.push(input);
    });
    return invalid;
  }

  /* --------------------------------------------------------------------
     Form-level alert
     -------------------------------------------------------------------- */

  function showFormAlert(count) {
    if (!alertBox) return;
    alertBox.innerHTML = icon('alert-circle') +
      '<span><strong>' + count + (count === 1 ? ' field needs' : ' fields need') +
      ' attention.</strong> Check the highlighted fields below and try again.</span>';
    alertBox.hidden = false;
  }

  function hideFormAlert() {
    if (alertBox) alertBox.hidden = true;
  }

  /* --------------------------------------------------------------------
     Submission
     -------------------------------------------------------------------- */

  function reference() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return 'FCC-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
           '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function value(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  function inquiryLabel() {
    var select = form.querySelector('[name="inquiry"]');
    var opt = select && select.options[select.selectedIndex];
    return opt ? opt.text : '';
  }

  /* The enquiry as plain text — the body of the email, and what the copy
     button puts on the clipboard. Optional fields that were left empty are
     dropped rather than sent as "Company: ". */
  function composeEnquiry(ref) {
    var head = [
      'Enquiry type: ' + inquiryLabel(),
      'Name: ' + value('name'),
      value('company') ? 'Company: ' + value('company') : '',
      'Email: ' + value('email'),
      value('phone') ? 'Phone: ' + value('phone') : ''
    ].filter(Boolean);

    return head.join('\n') + '\n\n' + value('message') + '\n\n' +
      '— Sent from the FCC (Philippines) Corp. website · Ref ' + ref;
  }

  /* >>> THIS IS THE FUNCTION TO REPLACE WHEN YOU WIRE UP A SERVER ENDPOINT <<< */
  function submitForm(form, ref) {
    var subject = '[Website] ' + inquiryLabel() + ': ' + value('subject');
    lastEnquiry = composeEnquiry(ref);
    var href = 'mailto:' + SALES_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lastEnquiry);

    return new Promise(function (resolve) {
      window.location.href = href;
      /* Give the mail app a beat to take focus before the page changes */
      window.setTimeout(resolve, 400);
    });
  }

  function copyEnquiry(button) {
    var text = 'To: ' + SALES_EMAIL + '\n\n' + lastEnquiry;
    var done = function () {
      button.innerHTML = icon('check', 'icon--sm') + '<span>Copied</span>';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(area);
    }
  }

  function showSuccess(ref) {
    if (!successPanel) return;

    successPanel.innerHTML =
      '<svg class="form-success__icon" aria-hidden="true" focusable="false">' +
        '<use href="#i-mail"></use></svg>' +
      '<h3 tabindex="-1" id="contact-success-heading">Your email is ready to send</h3>' +
      '<p class="u-muted">We opened your email app with the enquiry addressed to ' +
        '<a href="mailto:' + SALES_EMAIL + '">' + SALES_EMAIL + '</a>. ' +
        '<strong>Press Send there</strong> and our team will reply within two business days.</p>' +
      '<p class="u-muted">Nothing opened? Copy the enquiry and paste it into any email, ' +
        'or call us on the number listed here.</p>' +
      '<p class="form-success__ref">Reference ' + ref + '</p>' +
      '<div class="cluster cluster--sm form-success__actions">' +
        '<button type="button" class="btn btn--primary btn--sm" data-copy-enquiry>' +
          icon('layers', 'icon--sm') + '<span>Copy enquiry</span></button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-reset-form>Start a new message</button>' +
      '</div>';

    form.hidden = true;
    successPanel.hidden = false;

    /* Move focus to the confirmation. Without this, a screen-reader user is
       left inside a form that has just vanished. */
    var heading = $('#contact-success-heading', successPanel);
    if (heading) heading.focus();

    $('[data-copy-enquiry]', successPanel).addEventListener('click', function (e) {
      copyEnquiry(e.currentTarget);
    });

    $('[data-reset-form]', successPanel).addEventListener('click', function () {
      form.reset();
      touched = {};
      fields().forEach(function (input) { showError(input, ''); });
      hideFormAlert();
      successPanel.hidden = true;
      form.hidden = false;
      var first = form.querySelector('[name="name"]');
      if (first) first.focus();
    });
  }

  function onSubmit(e) {
    e.preventDefault();

    /* Honeypot — bots fill hidden fields, humans never see them */
    var honey = form.querySelector('[name="website"]');
    if (honey && honey.value) return;

    fields().forEach(function (input) { touched[input.name] = true; });

    var invalid = validateAll();

    if (invalid.length) {
      showFormAlert(invalid.length);
      invalid[0].focus();
      invalid[0].scrollIntoView({
        behavior: (window.Motion && window.Motion.prefersReduced()) ? 'auto' : 'smooth',
        block: 'center'
      });
      return;
    }

    hideFormAlert();

    var button = form.querySelector('[type="submit"]');
    var originalHTML = button.innerHTML;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span><span>Opening your email…</span>';

    var ref = reference();
    submitForm(form, ref)
      .then(function () {
        showSuccess(ref);
      })
      .catch(function () {
        showFormAlert(1);
        if (alertBox) {
          alertBox.innerHTML = icon('alert-circle') +
            '<span><strong>Your message could not be sent.</strong> ' +
            'Please try again, or email us directly using the address in the contact details.</span>';
        }
      })
      .then(function () {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = originalHTML;
      });
  }

  /* --------------------------------------------------------------------
     Init
     -------------------------------------------------------------------- */

  function init() {
    form = $('[data-contact-form]');
    if (!form) return;

    alertBox     = $('[data-form-alert]');
    successPanel = $('[data-form-success]');

    fields().forEach(function (input) {
      /* Validate on blur the first time a field is touched... */
      input.addEventListener('blur', function () {
        touched[input.name] = true;
        validateField(input);
      });

      /* ...and once it has errored, re-validate as they type so the error
         clears the moment it is fixed. Never validate an untouched field
         on keystroke — that scolds people mid-word. */
      var live = function () {
        if (fieldWrap(input) && fieldWrap(input).classList.contains('is-invalid')) {
          validateField(input, true);
        }
      };
      input.addEventListener('input', live);
      input.addEventListener('change', live);
    });

    form.addEventListener('submit', onSubmit);

    /* Deep links pre-fill the form: "Apply for this role" (data-apply) and
       every data-inquiry CTA — quotation, distributorship, CV. The link's own
       href="#contact" still does the scrolling, through Nav. */
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-apply], [data-inquiry]');
      if (!trigger) return;

      var inquiry = form.querySelector('[name="inquiry"]');
      var subject = form.querySelector('[name="subject"]');
      var type, line;

      if (trigger.hasAttribute('data-apply')) {
        type = 'careers';
        line = 'Application: ' + trigger.getAttribute('data-apply');
      } else {
        type = trigger.getAttribute('data-inquiry');
        line = trigger.getAttribute('data-subject') || SUBJECTS[type] || '';
      }

      /* The form may still be showing the confirmation from an earlier send */
      if (form.hidden && successPanel) {
        successPanel.hidden = true;
        form.hidden = false;
      }
      if (inquiry && type) inquiry.value = type;
      /* Never overwrite a subject the visitor has already typed */
      if (subject && line && !subject.value.trim()) subject.value = line;
    });
  }

  return { init: init };
})();
