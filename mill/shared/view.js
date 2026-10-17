'use strict';
// Mill shared view helpers (DOM only; no storage, no network). One place for the two rules every piece follows:
//  1. route(fn): fn runs on first load and on EVERY hashchange (valid, bad, old-version or empty). fn must rebuild all
//     state and DOM from scratch; use clearInputs() so nothing from a previous link or a half-typed field survives.
//  2. readOnly(root, on): a recipient view is read-only in the DOM, not just hidden by CSS: every form control inside root
//     is disabled (previous disabled state remembered; data-ro-keep opts out). Text and links stay readable and usable:
//     no inert, no aria-hidden. Pass on=false to restore.
(function (root) {
  var CTRL = 'input,select,textarea,button';
  function route(fn) {
    function run() { clearToast(); fn(location.hash && location.hash !== '#' ? location.hash : ''); }
    window.addEventListener('hashchange', run);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }
  function clearInputs(scope) {
    (scope || document).querySelectorAll('input,textarea,select').forEach(function (e) {
      if (e.type === 'button' || e.type === 'submit' || e.hasAttribute('data-keep')) return;
      if (e.tagName === 'SELECT') e.selectedIndex = e.options.length ? 0 : -1; else if (e.type === 'checkbox' || e.type === 'radio') e.checked = false; else e.value = '';
    });
  }
  function readOnly(scope, on) {
    if (!scope) return;
    scope.querySelectorAll(CTRL).forEach(function (e) {
      if (e.hasAttribute('data-ro-keep')) return;
      if (on) { if (!e.hasAttribute('data-ro-was')) e.setAttribute('data-ro-was', e.disabled ? '1' : '0'); e.disabled = true; }
      else if (e.hasAttribute('data-ro-was')) { e.disabled = e.getAttribute('data-ro-was') === '1'; e.removeAttribute('data-ro-was'); }
    });
    // Never inert, never aria-hidden, never aria-disabled on the region (QA BYG N1 / TSH KS-1): the read-only content stays in
    // the accessibility tree and links in it (Call, Text) stay real, focusable and clickable. Only form controls are disabled.
    scope.inert = false; scope.removeAttribute('aria-disabled');
  }
  // 5. One toast per page (#toast), one timer. route() clears it, so no message from a previous list survives a link change.
  var toastT = 0;
  function clearToast() { clearTimeout(toastT); toastT = 0; var t = document.getElementById('toast'); if (t) { t.hidden = true; t.textContent = ''; } }
  function toast(msg, ms) { var t = document.getElementById('toast'); if (!t) return; clearTimeout(toastT); t.textContent = msg; t.hidden = false; toastT = setTimeout(function () { t.hidden = true; t.textContent = ''; toastT = 0; }, ms || 3200); }
  // 6. Blur-time validation never re-renders mid-click: afterPointer(f) runs f now, or, if a mouse/touch press caused the
  //    blur, right after that press's click has landed (QA OLT N1: the first click after a field blur was swallowed).
  var pointerIsDown = false;
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', function () { pointerIsDown = true; }, true);
    document.addEventListener('pointerup', function () { setTimeout(function () { pointerIsDown = false; }, 0); }, true);
  }
  function afterPointer(f) { if (!pointerIsDown) { f(); return; } document.addEventListener('pointerup', function () { setTimeout(f, 0); }, { once: true, capture: true }); }
  // 3. Sender framing: text someone else typed is shown quoted, in body type, never inside a product sentence and
  //    never styled as a product heading. typed('Ana') -> <span class="mill-typed">“Ana”</span> (text node only).
  //    quote('Ana') -> '“Ana”' is the same rule for plain-text places (copied text, <option> labels, aria text).
  function quote(text) { return root.MILL.quote(text); } // one rule (core.js): typed “ ” „ ‟ « » shown as " inside the frame
  function typed(text, cls, tag) { var e = document.createElement(tag || 'span'); e.className = 'mill-typed' + (cls ? ' ' + cls : ''); e.textContent = quote(text); return e; }
  // 4. Bad-link / reset hygiene: no validation state survives a route. Clears aria-invalid + aria-describedby links to
  //    error boxes, empties every error element matched by sel, and hides those marked data-err-hide.
  function clearErrors(scope, sel) {
    scope = scope || document;
    scope.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
    if (sel) scope.querySelectorAll(sel).forEach(function (e) { e.textContent = ''; if (e.hasAttribute('data-err-hide')) e.hidden = true; });
  }
  // QA KS-1r (all pieces): an in-page link never touches the address bar (that would replace a shared link's fragment and
  // reload the tab as "damaged") and always lands: scroll the target into view and move focus to it (tabindex=-1 if needed).
  // Pieces that handle their own links (preventDefault) are left alone.
  function land(t) { if (!t) return; if (!t.matches('a[href],button,input,select,textarea,[tabindex]') || t.disabled) { t = t.disabled ? (t.closest('[tabindex]') || t.parentNode) : t; if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); }
    t.scrollIntoView({ block: 'start' }); try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button) return; var a = ev.target && ev.target.closest && ev.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1), t = id && document.getElementById(id); if (!t) return; ev.preventDefault(); land(t); });
  // QA D7 (all pieces): the WHOLE link (origin + path + '#' + fragment) is capped at 2,000 characters, whatever the origin.
  var URL_MAX = 2000;
  function linkFor(frag) { var u = location.origin + location.pathname + '#' + frag; return u.length <= URL_MAX ? u : null; }
  root.MILLVIEW = { land: land, URL_MAX: URL_MAX, linkFor: linkFor, afterPointer: afterPointer, toast: toast, clearToast: clearToast, clearErrors: clearErrors, route: route, clearInputs: clearInputs, readOnly: readOnly, typed: typed, quote: quote };
})(this);
