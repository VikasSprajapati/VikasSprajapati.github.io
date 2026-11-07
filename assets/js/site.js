/* Shared behaviour for every page. Each feature checks that its elements exist,
   so the same file works on the home page and on the case study pages. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- opened from disk (file://): make folder links open their index.html ----------
     GitHub Pages serves work/zob-connect/ as work/zob-connect/index.html; a browser reading
     files from disk shows a folder listing instead. Online, links stay clean. */
  if (location.protocol === 'file:') {
    $$('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (/^([a-z]+:|#|\/\/)/i.test(href)) return;          // absolute, mailto:, same-page anchors
      var i = href.indexOf('#'), path = i < 0 ? href : href.slice(0, i), hash = i < 0 ? '' : href.slice(i);
      if (path === '' ) return;
      if (path.slice(-1) === '/') a.setAttribute('href', path + 'index.html' + hash);
    });
  }

  /* ---------- theme ---------- */
  function isDark() {
    var a = root.getAttribute('data-theme');
    if (a) return a === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  /* Apply a theme change with a circular reveal from the click point (Chrome/Edge),
     or a short colour fade elsewhere. */
  function withTransition(change, x, y) {
    if (reduce) { change(); afterThemeChange(); return; }
    if (document.startViewTransition) {
      var t = document.startViewTransition(function () { change(); afterThemeChange(); });
      t.ready.then(function () {
        var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
    } else {
      root.classList.add('theme-fade');
      change(); afterThemeChange();
      setTimeout(function () { root.classList.remove('theme-fade'); }, 500);
    }
  }
  function centre(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function afterThemeChange() {
    // browser address-bar colour follows the page background
    var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    $$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', bg); m.removeAttribute('media'); });
    syncPaletteMenu();
  }

  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function (e) {
    var next = isDark() ? 'light' : 'dark', c = centre(themeBtn);
    withTransition(function () {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vp-theme', next); } catch (err) {}
    }, e.clientX || c[0], e.clientY || c[1]);
  });

  /* ---------- palette switcher ---------- */
  var palBtn = $('#paletteBtn'), palMenu = $('#palMenu');
  function syncPaletteMenu() {
    var cur = root.getAttribute('data-palette') || 'ink';
    $$('.pal-opt').forEach(function (o) { o.setAttribute('aria-checked', String(o.getAttribute('data-palette') === cur)); });
  }
  function closePal(focusBtn) {
    if (!palMenu || palMenu.hidden) return;
    palMenu.hidden = true; palBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) palBtn.focus();
  }
  if (palBtn && palMenu) {
    syncPaletteMenu();
    palBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = palMenu.hidden;
      palMenu.hidden = !open; palBtn.setAttribute('aria-expanded', String(open));
      if (open) { var cur = $('.pal-opt[aria-checked="true"]', palMenu) || $('.pal-opt', palMenu); cur.focus(); }
    });
    $$('.pal-opt', palMenu).forEach(function (o, i, all) {
      o.addEventListener('click', function (e) {
        var p = o.getAttribute('data-palette'), c = centre(o);
        closePal(false);
        if (p === root.getAttribute('data-palette')) return;
        withTransition(function () {
          root.setAttribute('data-palette', p);
          try { localStorage.setItem('vp-palette', p); } catch (err) {}
        }, e.clientX || c[0], e.clientY || c[1]);
      });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length].focus();
        }
      });
    });
    document.addEventListener('click', function (e) { if (!palMenu.hidden && !palMenu.contains(e.target)) closePal(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePal(true); });
  }
  afterThemeChange();

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menuBtn'), links = $('#navLinks');
  function closeMenu() { if (!links) return; links.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    // tap outside the open menu closes it
    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !links.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
    });
  }

  /* ---------- nav state, progress bar, back to top ---------- */
  var nav = $('header.nav'), bar = $('#progress'), top = $('#toTop');
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (nav) nav.classList.toggle('scrolled', y > 10);
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (top) top.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- active nav link (same-page anchors only) ---------- */
  var navMap = {};
  $$('#navLinks a').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') navMap[href.slice(1)] = a;
  });
  /* sliding accent underline under the active menu item */
  var navInd = null;
  if (links) {
    navInd = document.createElement('li');
    navInd.className = 'nav-ind';
    navInd.setAttribute('aria-hidden', 'true');
    links.appendChild(navInd);
  }
  function moveInd() {
    if (!navInd) return;
    var a = $('#navLinks a.active');
    if (!a || getComputedStyle(navInd).display === 'none') { navInd.style.opacity = '0'; return; }
    navInd.style.left = (a.offsetLeft + 12) + 'px';
    navInd.style.width = Math.max(a.offsetWidth - 24, 8) + 'px';
    navInd.style.opacity = '1';
  }
  moveInd();
  window.addEventListener('resize', moveInd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);

  if ('IntersectionObserver' in window && Object.keys(navMap).length) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && navMap[en.target.id]) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove('active'); });
          navMap[en.target.id].classList.add('active');
          moveInd();
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
    // above the first menu section (the hero), nothing is highlighted
    var firstSec = document.getElementById(Object.keys(navMap)[0]);
    window.addEventListener('scroll', function () {
      if (firstSec && window.scrollY + innerHeight * 0.5 < firstSec.offsetTop) {
        Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove('active'); });
        moveInd();
      }
    }, { passive: true });
  }

  /* ---------- long lists: "show all" buttons ---------- */
  $$('.more-btn').forEach(function (btn) {
    var grid = document.getElementById(btn.getAttribute('data-more'));
    if (!grid) return;
    btn.addEventListener('click', function () {
      grid.classList.remove('collapsed');
      grid.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      btn.parentElement.hidden = true;
    });
  });

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 70 + 'ms'; revObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce || isNaN(target)) { el.textContent = isNaN(target) ? el.textContent : target; return; }
    var start = null, dur = 1200;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cObs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cObs.observe(c); });
  }

  /* ---------- rotating role (home hero) ---------- */
  var rot = $('#rotator');
  if (rot && !reduce) {
    var roles = ['Integration Engineer', 'Technical Lead', 'Shopify Developer', 'AI Product Builder', 'Data Platform Engineer'];
    var ri = 0, ci = roles[0].length, deleting = true;
    (function tick() {
      if (deleting) { ci--; if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; } }
      else { ci++; }
      rot.textContent = roles[ri].slice(0, Math.max(ci, 0));
      var delay = deleting ? 45 : 85;
      if (!deleting && ci >= roles[ri].length) { deleting = true; delay = 1800; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- terminal lines (home hero) ---------- */
  var lines = $$('#term .term-line');
  if (lines.length) {
    var playTerm = function () {
      lines.forEach(function (l) { l.classList.remove('on'); });
      lines.forEach(function (l, i) { setTimeout(function () { l.classList.add('on'); }, reduce ? 0 : 350 + i * 420); });
    };
    playTerm();
    if (!reduce) setInterval(playTerm, 14000);
  }

  /* ---------- marquee: duplicate content for a seamless loop ---------- */
  ['#track1', '#track2'].forEach(function (sel) {
    var t = $(sel); if (!t) return;
    var n = t.children.length;
    t.insertAdjacentHTML('beforeend', t.innerHTML);
    Array.prototype.slice.call(t.children, n).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
  });

  /* ---------- project filters ---------- */
  var filters = $$('.filter'), cards = $$('.work .card');
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      var cat = f.getAttribute('data-filter');
      filters.forEach(function (x) { x.setAttribute('aria-pressed', String(x === f)); });
      var pg = document.getElementById('projectGrid');
      if (pg && cat !== 'all') { pg.classList.remove('collapsed'); var mb = document.querySelector('[data-more="projectGrid"]'); if (mb) mb.parentElement.hidden = true; }
      cards.forEach(function (c) {
        var show = cat === 'all' || (' ' + c.getAttribute('data-cat') + ' ').indexOf(' ' + cat + ' ') !== -1;
        c.classList.toggle('hide', !show);
        if (show) c.classList.add('in');
      });
    });
  });

  /* ---------- screen switchers (thumbnails swap the main image) ---------- */
  $$('[data-screens]').forEach(function (box) {
    var main = $('.screen-main', box), cap = $('figcaption', box), thumbs = $$('.thumb', box);
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        main.src = t.getAttribute('data-src');
        main.alt = t.getAttribute('data-alt');
        if (cap) cap.textContent = t.getAttribute('data-caption');
        thumbs.forEach(function (x) { x.setAttribute('aria-pressed', String(x === t)); });
      });
    });
  });

  /* ---------- lightbox: click a screenshot to see it full size ---------- */
  var zoomables = $$('img[data-zoom]');
  if (zoomables.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Screenshot');
    lb.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><p class="lightbox-cap"></p>';
    document.body.appendChild(lb);
    var lbImg = document.createElement('img'), lbCap = $('.lightbox-cap', lb), lastFocus = null;
    var close = function () { lb.classList.remove('open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
    zoomables.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      var open = function () {
        lastFocus = img;
        if (!lbImg.parentNode) lb.insertBefore(lbImg, lbCap);  // added on first open, so no empty image sits in the page
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.getAttribute('data-zoom') || img.alt;
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
        $('.lightbox-close', lb).focus();
      };
      img.addEventListener('click', open);
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox-close')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- contact form ----------
     Sends in the background and shows the result in place. The delivery service is set on the
     <form>: data-web3forms-key="…" uses Web3Forms; otherwise data-ajax (FormSubmit) is used.
     If sending fails for any reason, the visitor gets a ready-filled email instead of a dead end. */
  var OWNER = 'vikasprajapati.dev@gmail.com';
  $$('form.cform').forEach(function (form) {
    var status = $('.cform-status', form), btn = $('button[type="submit"]', form);
    var say = function (msg, kind) { status.textContent = msg; status.className = 'cform-status' + (kind ? ' ' + kind : ''); };
    var fallback = function (data, reason) {
      var body = (data.message || '') + '\n\n— ' + (data.name || '') + (data.company ? ', ' + data.company : '') + '\n' + (data.email || '');
      var href = 'mailto:' + OWNER + '?subject=' + encodeURIComponent(data._subject || 'Message from your portfolio') + '&body=' + encodeURIComponent(body);
      status.className = 'cform-status err';
      status.textContent = (reason || "The form couldn't send right now.") + ' ';
      var a = document.createElement('a');
      a.href = href;
      a.className = 'btn btn-ghost btn-sm';
      a.style.marginTop = '10px';
      a.textContent = 'Open in my email app (message filled in)';
      status.appendChild(document.createElement('br'));
      status.appendChild(a);
    };
    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) return;          // fall back to a normal post
      e.preventDefault();
      if (form.elements._honey && form.elements._honey.value) return;   // bot filled the trap
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      data._subject = 'Portfolio: ' + (data.topic || 'Message') + ' from ' + (data.name || 'someone');
      var key = form.getAttribute('data-web3forms-key'), url, payload;
      if (key) {
        url = 'https://api.web3forms.com/submit';
        payload = { access_key: key, subject: data._subject, from_name: 'Portfolio contact form', replyto: data.email,
                    name: data.name, email: data.email, company: data.company, topic: data.topic, message: data.message, botcheck: '' };
      } else {
        url = form.getAttribute('data-ajax');
        payload = data;
      }
      btn.disabled = true;
      say('Sending…');
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; btn.disabled = false; fallback(data, 'Sending is taking too long.'); } }, 15000);
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (done) return; done = true; clearTimeout(timer);
          if (j.success === true || String(j.success) === 'true') {
            form.reset();
            form.classList.add('sent');
            say('');
          } else {
            fallback(data, j.message ? j.message + '.' : null);
          }
        })
        .catch(function () { if (done) return; done = true; clearTimeout(timer); fallback(data); })
        .then(function () { btn.disabled = false; });
    });
  });

  /* ---------- copy email ---------- */
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  var copyBtn = $('#copyEmail');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var email = copyBtn.getAttribute('data-email');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () { showToast('Email copied to clipboard'); },
        function () { location.href = 'mailto:' + email; });
    } else { location.href = 'mailto:' + email; }
  });

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
