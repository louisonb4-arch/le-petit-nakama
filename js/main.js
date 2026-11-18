/* Le Petit Nakama — interactions & animations */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- heure de Paris & horaires ---------- */
  const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const SLOTS = { 1: [[720, 840], [1080, 1440]], 2: [[720, 840], [1080, 1440]], 3: [[720, 840], [1080, 1440]], 4: [[720, 840], [1080, 1500]], 5: [[720, 840], [1080, 1500]], 6: [], 0: [] };
  const NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function parisNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => (p.find(x => x.type === t) || {}).value;
    return { d: DAYS[g('weekday')], m: (+g('hour')) * 60 + (+g('minute')) };
  }
  const hm = m => { m %= 1440; const h = Math.floor(m / 60), mi = m % 60; return h === 0 && mi === 0 ? 'minuit' : `${h}h${mi ? String(mi).padStart(2, '0') : ''}`; };
  function status() {
    const { d, m } = parisNow();
    const prev = (d + 6) % 7;
    for (const [a, b] of SLOTS[prev]) if (b > 1440 && m < b - 1440) return { open: true, txt: `Ouvert · jusqu'à ${hm(b)}` };
    for (const [a, b] of SLOTS[d]) if (m >= a && m < b) return { open: true, txt: `Ouvert · jusqu'à ${hm(b)}` };
    for (const [a] of SLOTS[d]) if (m < a) return { open: false, txt: `Fermé · ouvre à ${hm(a)}` };
    for (let i = 1; i <= 7; i++) {
      const dd = (d + i) % 7;
      if (SLOTS[dd].length) return { open: false, txt: `Fermé · rouvre ${i === 1 ? 'demain' : NAMES[dd]} ${hm(SLOTS[dd][0][0])}` };
    }
    return { open: false, txt: 'Fermé' };
  }
  function paintStatus() {
    const s = status();
    $$('[data-status]').forEach(el => { el.classList.toggle('is-open', s.open); $('[data-status-text]', el).textContent = s.txt; });
    const { d } = parisNow();
    $$('[data-hours] li').forEach(li => li.classList.toggle('is-today', +li.dataset.d === d));
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* ---------- header + menu ---------- */
  const top = $('#top'), menu = $('#menu'), burger = $('.burger');
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    top.classList.toggle('is-solid', y > 40);
    if (!top.classList.contains('is-menu')) top.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
    if (y < lastY - 2) top.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    top.classList.toggle('is-menu', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- midi / soir ---------- */
  const duo = $('.duo');
  function setMode(mode) {
    const sw = $('.duo__switch'), r = duo.getBoundingClientRect(), b = $(`[data-set=${mode}]`, sw).getBoundingClientRect();
    duo.style.setProperty('--cx', `${b.left + b.width / 2 - r.left}px`);
    duo.style.setProperty('--cy', `${b.top + b.height / 2 - r.top}px`);
    duo.dataset.mode = mode;
    $$('[data-set]', sw).forEach(x => x.setAttribute('aria-pressed', x.dataset.set === mode));
    $('.duo__layer--midi').setAttribute('aria-hidden', mode !== 'midi');
    $('.duo__layer--soir').setAttribute('aria-hidden', mode !== 'soir');
  }
  $$('[data-set]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.set)));
  { const { m } = parisNow(); if (m >= 960 || m < 240) setMode('soir'); }

  /* ---------- carte : étiquettes tanzaku ---------- */
  const fuda = $('[data-fuda]');
  const KAN = ['一', '二', '三', '四', '五', '六', '七', '八'];
  if (fuda) {
    const strips = $$('.fuda__strip', fuda), nameEl = $('[data-fuda-name]', fuda), descEl = $('[data-fuda-desc]', fuda), cntEl = $('[data-fuda-count]', fuda);
    let cur = 0;
    const show = i => {
      i = (i + strips.length) % strips.length;
      if (i === cur) return;
      cur = i;
      strips.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.setAttribute('aria-pressed', k === i); });
      const swap = () => { nameEl.textContent = strips[i].dataset.name; descEl.textContent = strips[i].dataset.desc; cntEl.textContent = `${KAN[i]} / ${KAN[strips.length - 1]}`; };
      if (window.gsap && !RM) {
        gsap.timeline().to([nameEl, descEl], { y: -10, autoAlpha: 0, duration: .22, ease: 'power2.in', stagger: .04 })
          .add(swap).fromTo([nameEl, descEl], { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'power3.out', stagger: .05 });
      } else swap();
    };
    // tant qu'on n'a rien touché : une étiquette fermée se soulève un peu, pour montrer qu'il y a une photo dessous
    let teaseTimer = null, peekI = 1;
    const stopTease = () => { fuda.classList.remove('is-tease'); clearInterval(teaseTimer); teaseTimer = null; };
    const peek = () => {
      const closed = strips.filter(s => !s.classList.contains('is-on'));
      const s = closed[peekI++ % closed.length];
      s.classList.add('is-peek'); setTimeout(() => s.classList.remove('is-peek'), 1350);
    };
    if (!RM && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        if (!fuda.classList.contains('is-tease')) return;
        if (en.isIntersecting && !teaseTimer) { setTimeout(peek, 1400); teaseTimer = setInterval(peek, 2600); }
        if (!en.isIntersecting && teaseTimer) { clearInterval(teaseTimer); teaseTimer = null; }
      }, { threshold: .5 }).observe($('.fuda__row', fuda));
    }
    strips.forEach((s, k) => s.addEventListener('click', () => { stopTease(); show(k); }));
    // glisser du doigt pour passer à l'étiquette voisine
    let x0 = null, y0 = null;
    const row = $('.fuda__row', fuda);
    row.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    row.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { stopTease(); show(cur + (dx < 0 ? 1 : -1)); }
      x0 = null;
    });
    row.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { show(cur + 1); strips[cur].focus(); } if (e.key === 'ArrowLeft') { show(cur - 1); strips[cur].focus(); } });
  }

  /* ---------- dock ---------- */
  const dock = $('[data-dock]');
  const infos = $('#infos');
  function dockUpd() {
    const y = scrollY, h = innerHeight;
    const ir = infos.getBoundingClientRect();
    dock.classList.toggle('is-on', y > h * 0.9 && ir.top > h * 0.6);
  }
  addEventListener('scroll', dockUpd, { passive: true });

  /* ---------- texte : mots ---------- */
  $$('[data-words]').forEach(p => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  /* ---------- cadre "meander" (soirées) ---------- */
  function drawFrame() {
    $$('[data-frame]').forEach(f => {
      const svg = $('.frame__svg', f), w = f.offsetWidth, h = f.offsetHeight, s = 22, g = 7;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      // spirale carrée (raimon) dans chaque coin + doubles filets
      const corner = (x, y, sx, sy) => {
        const P = (a, b) => `${x + sx * a},${y + sy * b}`;
        return `M${P(0, s + 18)} L${P(0, 0)} L${P(s, 0)} L${P(s, s)} L${P(g, s)} L${P(g, g)} L${P(s - g, g)} L${P(s - g, s - g)} M${P(s + 18, 0)} L${P(s, 0)}`;
      };
      let d = corner(0, 0, 1, 1) + corner(w, 0, -1, 1) + corner(0, h, 1, -1) + corner(w, h, -1, -1);
      d += `M${s + 18},0 L${w - s - 18},0 M${s + 18},${h} L${w - s - 18},${h} M0,${s + 18} L0,${h - s - 18} M${w},${s + 18} L${w},${h - s - 18}`;
      d += `M${s + 18},${g} L${w - s - 18},${g} M${s + 18},${h - g} L${w - s - 18},${h - g} M${g},${s + 18} L${g},${h - s - 18} M${w - g},${s + 18} L${w - g},${h - s - 18}`;
      svg.innerHTML = `<path d="${d}" pathLength="1"/>`;
    });
  }
  drawFrame();
  addEventListener('resize', () => { drawFrame(); });

  /* ---------- sans animation ---------- */
  const noren = $('.noren');
  if (RM || !hasGsap) {
    noren && noren.remove();
    document.body.classList.remove('is-intro');
    $$('[data-rv]').forEach(e => e.style.opacity = 1);
    $$('.ph[data-clip]').forEach(e => e.style.clipPath = 'none');
    $$('.mani__text .w').forEach(e => e.style.opacity = 1);
    return;
  }

  /* ---------- HERO (préparé en pause) ---------- */
  const heroTl = gsap.timeline({ paused: true });
  const sunArcs = $$('.hero__sun path');
  gsap.set(sunArcs, { strokeDasharray: 1, strokeDashoffset: 1 });
  heroTl
    .from('.hero__kicker', { y: 16, autoAlpha: 0, duration: .7, ease: 'power3.out' })
    .from('.hero__word path', { y: 60, autoAlpha: 0, rotate: () => gsap.utils.random(-8, 8), duration: .9, ease: 'back.out(1.6)', stagger: .045 }, '<.05')
    .to(sunArcs, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: { each: .06, from: 'end' } }, '<.2')
    .from('.hero__illu .bk', { scale: .82, autoAlpha: 0, transformOrigin: '50% 50%', duration: .9, ease: 'power3.out' }, '<.05')
    .from('.hero__illu .ik', { scale: .4, autoAlpha: 0, duration: .55, ease: 'back.out(2)', stagger: .016 }, '<.1')
    .from('.hero__foot [data-h]', { y: 24, autoAlpha: 0, duration: .8, ease: 'power3.out', stagger: .08 }, '-=.9')
    .add(() => { startDrops(); top.classList.add('is-ready'); });

  // gouttes de saké qui perlent du goulot
  function startDrops() {
    $$('.hero__illu .drop').forEach((d, i) => {
      gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 1 + i * .18 })
        .to(d, { x: -14 - i * 6, y: 10 + i * 8, autoAlpha: 0, scale: .6, duration: .9, ease: 'power1.in', transformOrigin: '50% 50%' })
        .set(d, { x: 0, y: 0, scale: .3 })
        .to(d, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(3)' });
    });
  }

  /* ---------- INTRO : le noren ---------- */
  function intro() {
    let seen = false;
    try { seen = !!sessionStorage.getItem('nk-noren'); sessionStorage.setItem('nk-noren', '1'); } catch (e) {}
    if (/[?&]intro/.test(location.search)) seen = false;
    const panels = $$('.noren__panel');
    const done = () => { noren.remove(); document.body.classList.remove('is-intro'); ScrollTrigger.refresh(); };
    const tl = gsap.timeline({ onComplete: done });

    if (!seen) {
      gsap.set('.noren__word', { autoAlpha: 0, y: 26 });
      gsap.set('.noren__mon, .noren__side, .noren__hello', { autoAlpha: 0 });
      tl.from('.noren__rod', { yPercent: -400, duration: .6, ease: 'power3.out' })
        .from('.noren__panels', { yPercent: -102, duration: 1, ease: 'power4.out' }, '<.15')
        .fromTo(panels, { rotate: i => [-3, 2, -2.5][i] }, { rotate: 0, duration: 1.6, ease: 'elastic.out(1,.32)', transformOrigin: '50% 0%' }, '<.45')
        .to('.noren__word', { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out' }, '<.05')
        .to('.noren__mon', { autoAlpha: 1, duration: .6 }, '<.2')
        .to('.noren__side', { autoAlpha: 1, duration: .6 }, '<.1')
        .to('.noren__hello', { autoAlpha: 1, duration: .6 }, '<')
        .addLabel('exit', '+=.45');
    } else {
      tl.addLabel('exit', .15);
    }
    // on pousse le rideau pour entrer
    tl.to('.noren__hello', { autoAlpha: 0, duration: .3 }, 'exit')
      .set(noren, { backgroundColor: 'transparent' }, 'exit+=.15')
      .to(panels, { rotateX: -84, yPercent: -4, x: i => (i - 1) * 46, skewX: i => (i - 1) * -4, duration: seen ? .8 : 1.05, ease: 'power3.in', stagger: { each: .08, from: 'center' } }, 'exit')
      .to('.noren__rod', { yPercent: -400, duration: .5, ease: 'power2.in' }, '>-.35')
      .add(() => heroTl.play(), 'exit+=.55');

    noren.addEventListener('click', () => { if (tl.currentLabel() !== 'exit' && tl.time() < tl.labels.exit) tl.seek('exit'); else tl.timeScale(2.5); }, { once: false });
  }
  if (noren) intro(); else heroTl.play();

  /* ---------- scroll : hero ---------- */
  gsap.to('.hero__illu svg', { yPercent: -10, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__sun', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- reveals génériques ---------- */
  $$('[data-lines]').forEach(h => {
    gsap.from($$('.ln>span', h), { yPercent: 110, rotate: 3, duration: 1, ease: 'power4.out', stagger: .09, scrollTrigger: { trigger: h, start: 'top 86%' } });
  });
  ScrollTrigger.batch('[data-rv]', {
    start: 'top 90%',
    onEnter: els => gsap.fromTo(els, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .08, overwrite: true })
  });
  $$('.ph[data-clip]').forEach(ph => {
    const img = $('img', ph);
    gsap.to(ph, { clipPath: 'inset(0% 0 0 0 round 22px)', duration: 1.25, ease: 'power4.inOut', scrollTrigger: { trigger: ph, start: 'top 88%' } });
    gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: ph, start: 'top 88%' } });
  });
  $$('[data-par]').forEach(img => {
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* manifeste : les mots s'encrent au scroll */
  gsap.to('.mani__text .w', { opacity: 1, stagger: .5, ease: 'none', scrollTrigger: { trigger: '.mani__text', start: 'top 80%', end: 'bottom 45%', scrub: .6 } });
  gsap.fromTo('.mani__pics .ph--b', { rotate: 6, yPercent: 14 }, { rotate: -3, yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.mani__pics', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('[data-spin] svg', { rotate: 220, ease: 'none', scrollTrigger: { trigger: '.mani__pics', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* cave : vagues (seigaiha) qui montent comme le plafond */
  gsap.fromTo('[data-waves]', { yPercent: 18 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.cave', start: 'top bottom', end: 'top 20%', scrub: true } });
  gsap.from('[data-waves] g', { scale: 0, transformOrigin: '50% 100%', duration: .7, ease: 'back.out(1.8)', stagger: { each: .012, from: 'random' }, scrollTrigger: { trigger: '.cave', start: 'top 85%' } });

  /* soirées : le cadre se trace */
  ScrollTrigger.create({
    trigger: '[data-frame]', start: 'top 82%', once: true,
    onEnter: () => {
      const p = $('[data-frame] .frame__svg path');
      if (p) gsap.fromTo(p, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' });
    }
  });

  /* la bande : les photos s'éventaillent */
  const deck = $('[data-deck]');
  if (deck) {
    gsap.timeline({ scrollTrigger: { trigger: deck, start: 'top 80%', end: 'bottom 70%', scrub: .8 } })
      .fromTo('.ph--team', { scale: .9, rotate: 0 }, { scale: 1, rotate: -1.5, ease: 'none' }, 0)
      .fromTo('.ph--c1', { xPercent: 50, yPercent: 30, rotate: 0 }, { xPercent: 0, yPercent: 0, rotate: -7, ease: 'none' }, 0)
      .fromTo('.ph--c2', { xPercent: -50, yPercent: 30, rotate: 0 }, { xPercent: 0, yPercent: 0, rotate: 6, ease: 'none' }, 0);
  }

  /* avis : le compteur */
  const sc = $('[data-count]');
  if (sc) {
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: sc, start: 'top 85%', once: true, onEnter: () => gsap.to(o, { v: 4.8, duration: 1.6, ease: 'power3.out', onUpdate: () => sc.textContent = o.v.toFixed(1).replace('.', ',') }) });
  }

  /* carte : les étiquettes tombent et se balancent, comme accrochées au mur */
  gsap.from('.fuda__rail', { scaleX: 0, duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: '[data-fuda]', start: 'top 85%' } });
  gsap.from('.fuda__strip', { yPercent: -16, autoAlpha: 0, rotate: i => [-5, 4, -3, 5, -4][i % 5], transformOrigin: '50% 0%', duration: 1.6, ease: 'elastic.out(1,.4)', stagger: .09, delay: .2, scrollTrigger: { trigger: '[data-fuda]', start: 'top 85%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
