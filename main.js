(function () {
  var html = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- language ---------- */
  var langBtns = document.querySelectorAll('.lang button');
  function setLang(l) {
    html.lang = l;
    langBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === l)); });
    store.set('lang', l);
  }
  var q = new URLSearchParams(location.search).get('lang');
  var initialLang = (q === 'es' || q === 'en') ? q :
    (store.get('lang') || ((navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en'));
  setLang(initialLang);
  langBtns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.set); }); });

  /* ---------- theme ---------- */
  var themeBtn = document.querySelector('.theme');
  function setTheme(t) {
    html.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.textContent = t === 'dark' ? '☀' : '◐';
    store.set('theme', t);
  }
  var qt = new URLSearchParams(location.search).get('theme');
  var savedTheme = (qt === 'dark' || qt === 'light') ? qt : store.get('theme');
  setTheme(savedTheme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (themeBtn) themeBtn.addEventListener('click', function () {
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ---------- clock (Lima) ---------- */
  var clocks = document.querySelectorAll('.clock');
  function tick() {
    try {
      var t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date());
      clocks.forEach(function (c) { c.textContent = t + ' PET'; });
    } catch (e) {}
  }
  tick(); setInterval(tick, 30000);

  /* ---------- scroll progress ---------- */
  var bar = document.querySelector('.progress');
  function onScroll() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }
  // Failsafe: never leave content hidden (background tabs pause observers; printing needs everything visible).
  function revealAll() { rv.forEach(function (el) { el.classList.add('in'); }); }
  setTimeout(function () { if (document.hidden) revealAll(); }, 1200);
  document.addEventListener('visibilitychange', function () { if (document.hidden) revealAll(); });
  addEventListener('beforeprint', revealAll);

  /* ---------- nav highlight ---------- */
  var links = document.querySelectorAll('.nav a');
  var secs = [].map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function (s) { if (s) so.observe(s); });
  }

  /* ---------- live-preview facades ---------- */
  function fit(vp, frame, w) {
    frame.style.transform = 'scale(' + (vp.clientWidth / w) + ')';
  }
  document.querySelectorAll('.viewport[data-live]').forEach(function (vp) {
    var btn = vp.querySelector('.try');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var w = parseInt(vp.dataset.w || '1280', 10), h = parseInt(vp.dataset.h || '800', 10);
      var f = document.createElement('iframe');
      f.src = vp.dataset.live;
      f.title = vp.dataset.title || 'Live preview';
      f.width = w; f.height = h;
      f.loading = 'lazy';
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      var img = vp.querySelector('img'); if (img) img.remove();
      btn.remove();
      vp.appendChild(f);
      fit(vp, f, w);
      if ('ResizeObserver' in window) new ResizeObserver(function () { fit(vp, f, w); }).observe(vp);
      else addEventListener('resize', function () { fit(vp, f, w); });
    });
  });
})();
