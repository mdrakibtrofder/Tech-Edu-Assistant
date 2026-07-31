/* ==========================================================================
   Modal service - one global overlay used for PDF preview, course quick-view,
   global search, keyboard help and external-link confirmation.

   Modal.open({ title, subtitle, body, size, actions, flush, onClose }) -> handle
   ========================================================================== */
(function (w) {
  'use strict';

  var TEA = (w.TEA = w.TEA || {});
  var d = TEA.dom;
  var el = d.el, icon = d.icon;

  var stack = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

  function open(opts) {
    opts = opts || {};

    var backdrop = el('.modal-backdrop', { role: 'presentation' });
    var modal = el('.modal' + (opts.size ? '.modal--' + opts.size : '') + (opts.flush ? '.modal--flush' : ''), {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title || 'Dialog',
      tabindex: '-1'
    });

    if (opts.title !== false) {
      var closeBtn = el('button.modal__close', {
        type: 'button', 'aria-label': 'Close dialog', 'data-tip': 'Close (Esc)'
      }, icon('close'));
      closeBtn.addEventListener('click', function () { handle.close(); });

      modal.appendChild(el('.modal__head', {}, [
        el('div', {}, [
          el('h2.modal__title', { text: opts.title || '' }),
          opts.subtitle ? el('p.modal__sub', { text: opts.subtitle }) : null
        ]),
        closeBtn
      ]));
    }

    var body = el('.modal__body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) d.append(body, opts.body);
    modal.appendChild(body);

    if (opts.actions && opts.actions.length) {
      var foot = el('.modal__foot');
      opts.actions.forEach(function (a) {
        var node;
        if (a.href) {
          node = el('a.btn.btn--' + (a.variant || 'ghost'), {
            href: a.href,
            target: a.newTab === false ? null : '_blank',
            rel: 'noopener',
            download: a.download ? '' : null
          }, [a.icon ? icon(a.icon) : null, a.label]);
        } else {
          node = el('button.btn.btn--' + (a.variant || 'ghost'), { type: 'button' },
            [a.icon ? icon(a.icon) : null, a.label]);
        }
        node.addEventListener('click', function (e) {
          if (a.onClick) a.onClick(e, handle);
          if (a.closes !== false && !a.href) handle.close();
        });
        foot.appendChild(node);
      });
      modal.appendChild(foot);
    }

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.classList.add('is-locked');

    var previouslyFocused = document.activeElement;

    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop && opts.dismissible !== false) handle.close();
    });

    function onKey(e) {
      if (stack[stack.length - 1] !== handle) return;
      if (e.key === 'Escape' && opts.dismissible !== false) {
        e.preventDefault();
        handle.close();
        return;
      }
      if (e.key !== 'Tab') return;
      var items = d.qsa(FOCUSABLE, modal).filter(function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);

    var handle = {
      el: modal,
      body: body,
      backdrop: backdrop,
      close: function () {
        var i = stack.indexOf(handle);
        if (i < 0) return;
        stack.splice(i, 1);
        document.removeEventListener('keydown', onKey);
        backdrop.classList.remove('is-open');
        setTimeout(function () {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
          if (!stack.length) document.body.classList.remove('is-locked');
          if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        }, 260);
        if (opts.onClose) opts.onClose();
      }
    };

    stack.push(handle);

    requestAnimationFrame(function () {
      backdrop.classList.add('is-open');
      var target = opts.autofocus ? d.qs(opts.autofocus, modal) : d.qs(FOCUSABLE, body);
      (target || modal).focus();
    });

    return handle;
  }

  /* ---- Preset: PDF preview --------------------------------------------- */

  function preview(res) {
    var file = res.file || res.href;
    return open({
      title: res.title,
      subtitle: [res.kindLabel, res.size, res.context].filter(Boolean).join(' · '),
      size: 'xl',
      flush: true,
      body: el('iframe.modal__frame', {
        src: file, title: res.title + ' preview', loading: 'lazy'
      }),
      actions: [
        { label: 'Open in new tab', icon: 'external', href: file },
        { label: 'Download', icon: 'download', href: file, variant: 'primary', download: true }
      ]
    });
  }

  /* ---- Preset: confirm before leaving the site -------------------------- */

  function confirmExternal(url, label) {
    var host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = url; }
    return open({
      title: 'Leaving Tech Edu Assistant',
      size: null,
      body: el('div', {}, [
        el('p', { text: 'This link opens an external site:' }),
        el('p.text-sm', {}, el('strong', { text: host })),
        el('p.text-sm.text-muted', { text: label || '' })
      ]),
      actions: [
        { label: 'Cancel' },
        { label: 'Continue', icon: 'external', href: url, variant: 'primary' }
      ]
    });
  }

  TEA.Modal = { open: open, preview: preview, confirmExternal: confirmExternal, stack: stack };
})(window);
