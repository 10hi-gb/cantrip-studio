'use strict';
// Mill shared view helpers (DOM only; no storage, no network). One place for the two rules every piece follows:
//  1. route(fn): fn runs on first load and on EVERY hashchange (valid, bad, old-version or empty). fn must rebuild all
//     state and DOM from scratch; use clearInputs() so nothing from a previous link or a half-typed field survives.
//  2. readOnly(root, on): a recipient view is read-only in the DOM, not just hidden by CSS: every control inside root is
//     disabled (previous disabled state remembered), root is inert and aria-disabled. Pass on=false to restore.
(function (root) {
  var CTRL = 'input,select,textarea,button';
  function route(fn) {
    function run() { fn(location.hash && location.hash !== '#' ? location.hash : ''); }
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
    scope.inert = !!on; if (on) scope.setAttribute('aria-disabled', 'true'); else scope.removeAttribute('aria-disabled');
  }
  // 3. Sender framing: text someone else typed is shown quoted, in body type, never inside a product sentence and
  //    never styled as a product heading. typed('Ana') -> <span class="mill-typed">“Ana”</span> (text node only).
  //    quote('Ana') -> '“Ana”' is the same rule for plain-text places (copied text, <option> labels, aria text).
  function quote(text) { return root.MILL && root.MILL.quote ? root.MILL.quote(text) : '\u201C' + text + '\u201D'; }
  function typed(text, cls, tag) { var e = document.createElement(tag || 'span'); e.className = 'mill-typed' + (cls ? ' ' + cls : ''); e.textContent = quote(text); return e; }
  // 4. Bad-link / reset hygiene: no validation state survives a route. Clears aria-invalid + aria-describedby links to
  //    error boxes, empties every error element matched by sel, and hides those marked data-err-hide.
  function clearErrors(scope, sel) {
    scope = scope || document;
    scope.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
    if (sel) scope.querySelectorAll(sel).forEach(function (e) { e.textContent = ''; if (e.hasAttribute('data-err-hide')) e.hidden = true; });
  }
  root.MILLVIEW = { clearErrors: clearErrors, route: route, clearInputs: clearInputs, readOnly: readOnly, typed: typed, quote: quote };
})(this);
