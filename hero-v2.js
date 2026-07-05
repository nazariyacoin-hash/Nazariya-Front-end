/* ---------------------------------------------------------
   hero v2 — mounts a new home hero on top of the compiled
   React bundle: centered headline + flowing card conveyor.
   The belt matches the reference motion: slow idle glide,
   drag/flick with momentum, directional motion blur while
   moving fast, easing back into the glide.
   The original hero section stays in the DOM (hidden) so the
   bundle's own logic keeps working untouched.
   --------------------------------------------------------- */
(() => {
  const IMAGES = [
    '/work/print/dye-mag.jpg',
    '/work/content/jtd-3.jpg',
    '/work/social/wafflesome-2.mp4',
    '/work/packaging/cutlery-pack.jpg',
    '/work/social/reel-vackadoo-2.mp4',
    '/work/content/texture-4.jpg',
    '/work/social/wrii-1.jpg',
    '/work/packaging/cards-2.jpg',
    '/work/social/reel-vackadoo.mp4',
    '/work/content/insta-feed.jpg',
    '/work/social/reel-wrii.mp4',
    '/work/print/zine-disha-2.jpg',
  ];
  const TILT = 14;               // rotation across the belt, deg edge-to-edge
  const MAX_FLICK = 5200;        // px/s cap on a thrown belt
  const BLUR_FROM = 420;         // px/s where motion blur starts
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const html = () => `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <filter id="hv2-mblur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0,0"/>
        </filter>
      </defs>
    </svg>
    <div class="hv2__inner">
      <h1 class="hv2__title">
        <span class="hv2__line"><span>We Make Brands</span></span>
        <span class="hv2__line"><span>Worth <em>Talking</em> About.</span></span>
      </h1>
      <p class="hv2__sub">Whether you&rsquo;re launching something new or redefining what&rsquo;s already there, Nazariya creates <br class="hv2__br">branding, websites, content, and campaigns designed to elevate how the world sees you.</p>
    </div>
    <div class="hv2__belt" aria-hidden="true"></div>`;

  function mount(main) {
    const legacy = main.querySelector('section.hero');
    if (!legacy || main.querySelector('.hero-v2')) return;
    legacy.id = 'top-legacy';

    const section = document.createElement('section');
    section.className = 'hero-v2';
    section.id = 'top';
    section.innerHTML = html();
    main.insertBefore(section, main.firstChild);
    document.documentElement.classList.add('has-hero-v2');

    startBelt(section.querySelector('.hv2__belt'));

    // entrance after the page has painted / loader has begun its reveal
    const enter = () => setTimeout(() => document.documentElement.classList.add('hv2-in'), 150);
    if (document.readyState === 'complete') enter();
    else window.addEventListener('load', enter, { once: true });
  }

  function startBelt(belt) {
    const blurNode = document.querySelector('#hv2-mblur feGaussianBlur');
    let cards = [];
    let spacing = 0, cardW = 0, total = 0, drop = 0, W = 0;
    let base = 0;                // idle glide speed, px/s
    let vel = 0;                 // current belt velocity, px/s
    let offset = 0;
    let raf = 0, last = 0, inView = true;
    let dragging = false, lastX = 0, lastT = 0, lastMoveT = 0, moveVel = 0;
    let blurred = false;

    function build() {
      W = window.innerWidth;
      cardW = Math.max(W <= 640 ? 94 : 118, Math.min(W * 0.125, 180));
      const cardH = Math.round(cardW * 1.4);
      const gap = Math.max(14, W * 0.018);
      spacing = cardW + gap;
      drop = Math.min(70, W * 0.05);
      base = Math.max(40, W * 0.045);
      if (!dragging) vel = reduced ? 0 : base;
      const count = Math.max(Math.ceil((W + 2 * spacing) / spacing), IMAGES.length);
      total = count * spacing;
      belt.style.height = Math.round(cardH + drop + 22) + 'px';

      belt.textContent = '';
      cards = [];
      for (let i = 0; i < count; i++) {
        const card = document.createElement('figure');
        card.className = 'hv2__card';
        card.style.margin = '0';
        card.style.width = Math.round(cardW) + 'px';
        card.style.height = cardH + 'px';
        const inner = document.createElement('div');
        inner.className = 'hv2__card-in';
        inner.style.width = '100%';
        inner.style.height = '100%';
        inner.style.transitionDelay = (0.35 + (i % 12) * 0.055) + 's';
        const src = IMAGES[i % IMAGES.length];
        let media;
        if (/\.(mp4|webm|mov)$/i.test(src)) {
          media = document.createElement('video');
          media.src = src;
          media.muted = true;
          media.loop = true;
          media.autoplay = true;
          media.playsInline = true;
          media.setAttribute('muted', '');
          media.setAttribute('playsinline', '');
          media.setAttribute('autoplay', '');
          // poster (still frame) shows instantly so the card is never an empty
          // box even before/without playback; preload=metadata keeps load light,
          // and play() is retried on canplay for motion over the poster.
          media.poster = src.replace(/\.(mp4|webm|mov)$/i, '.poster.jpg');
          media.preload = 'metadata';
          const tryPlay = () => { const p = media.play(); if (p && p.catch) p.catch(() => {}); };
          media.addEventListener('canplay', tryPlay, { once: true });
          tryPlay();
        } else {
          media = document.createElement('img');
          media.src = src;
          media.alt = '';
          media.loading = 'eager';
          media.decoding = 'async';
        }
        media.draggable = false;
        inner.appendChild(media);
        card.appendChild(inner);
        belt.appendChild(card);
        cards.push(card);
      }
      paint();
    }

    function paint() {
      for (let i = 0; i < cards.length; i++) {
        let x = ((i * spacing - offset) % total + total) % total - spacing;
        const u = (x + cardW / 2) / W - 0.5;   // -0.5 … 0.5 across the viewport
        const y = drop * 4 * u * u;            // arc: high centre, dipping edges
        const rot = u * TILT;
        cards[i].style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
      }
      // directional motion blur, proportional to speed (as in the reference)
      const b = Math.min(4, Math.max(0, (Math.abs(vel) - BLUR_FROM) / 380));
      if (b > 0.12) {
        blurNode.setAttribute('stdDeviation', (b * 2).toFixed(2) + ',0');
        if (!blurred) { belt.style.filter = 'url(#hv2-mblur)'; blurred = true; }
      } else if (blurred) {
        belt.style.filter = '';
        blurred = false;
      }
    }

    function tick(now) {
      // stop the loop if React has detached this belt (route change) so
      // old hero instances don't keep an orphaned rAF running forever
      if (!belt.isConnected) { raf = 0; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!dragging) {
        // momentum decays back into the idle glide
        vel += (base - vel) * (1 - Math.exp(-dt * 1.9));
        offset = ((offset + vel * dt) % total + total) % total;
      } else if (now - lastMoveT > 80) {
        // pointer holding still mid-drag: bleed off speed so blur fades
        moveVel *= Math.exp(-dt * 10);
        vel = moveVel;
      }
      paint();
      raf = requestAnimationFrame(tick);
    }
    function run() {
      if (raf || reduced || !inView) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    // drag / flick (skipped for reduced motion, where the belt is static)
    if (!reduced) {
      belt.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true;
        moveVel = 0;
        lastX = e.clientX;
        lastT = performance.now();
        belt.classList.add('is-grabbing');
        try { belt.setPointerCapture(e.pointerId); } catch (err) {}
      });
      belt.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dt = Math.max((now - lastT) / 1000, 0.001);
        offset = ((offset - dx) % total + total) % total;
        // smoothed pointer velocity → belt velocity is its inverse
        moveVel = moveVel * 0.75 + (-dx / dt) * 0.25;
        vel = moveVel;           // blur tracks the live drag speed
        lastX = e.clientX;
        lastT = now;
        lastMoveT = now;
        paint();
      });
      const release = () => {
        if (!dragging) return;
        dragging = false;
        belt.classList.remove('is-grabbing');
        vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, moveVel));
      };
      belt.addEventListener('pointerup', release);
      belt.addEventListener('pointercancel', release);
    }

    build();
    run();

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      inView ? run() : stop();
    }).observe(belt);

    let rt, lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      // width-only rebuild: ignore dispatched/height-only resizes (services-v2
      // fires resize on mount; mobile URL-bar toggles change height) so we
      // don't needlessly recreate — and re-download — the belt's video cards
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => { build(); }, 150);
    });
  }

  // ---- curtain transitions for in-page nav links -------------------
  // The bundle only plays its red curtain wipe when routing to /work.
  // Reuse its .tr overlay so about / services / contact open the same
  // way: curtain up → jump to the section underneath → curtain down.
  const CURTAIN_LINKS = {
    '/#about': { label: 'about us', hash: '#about' },
    '/#services': { label: 'what we do', hash: '#services' },
    '/#connect': { label: 'let’s connect', hash: '#connect' },
  };
  let curtainBusy = false;

  function curtainTo(label, hash) {
    const tr = document.querySelector('.tr');
    const target = document.querySelector(hash);
    const sheet = tr && tr.querySelector('.tr__sheet');
    const inner = tr && tr.querySelector('.tr__inner');
    if (!tr || !target || !sheet || !inner) { location.hash = hash; return; }
    const lab = tr.querySelector('.tr__label');
    curtainBusy = true;
    if (lab) lab.textContent = label;
    const EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
    tr.style.display = 'grid';
    tr.style.pointerEvents = 'auto';
    sheet.style.transition = 'none';
    sheet.style.transformOrigin = 'center bottom';
    sheet.style.transform = 'scaleY(0)';
    inner.style.transition = 'none';
    inner.style.opacity = '0';
    inner.style.transform = 'translateY(24px)';
    inner.style.visibility = 'visible';
    void sheet.offsetHeight;
    sheet.style.transition = 'transform 0.55s ' + EASE;
    sheet.style.transform = 'scaleY(1)';
    setTimeout(() => {
      inner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      inner.style.opacity = '1';
      inner.style.transform = 'translateY(0)';
    }, 320);
    const land = () => window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
    setTimeout(land, 600);   // fully covered — land on the section instantly
    setTimeout(land, 1000);  // re-land once lifted panels settle, still covered
    setTimeout(() => {
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(-24px)';
    }, 950);
    setTimeout(() => {
      sheet.style.transition = 'none';
      sheet.style.transformOrigin = 'center top';
      void sheet.offsetHeight;
      sheet.style.transition = 'transform 0.6s ' + EASE;
      sheet.style.transform = 'scaleY(0)';
    }, 1050);
    setTimeout(() => {
      // hand the overlay back to the bundle exactly as it left it
      tr.style.cssText = '';
      sheet.style.cssText = '';
      inner.style.cssText = '';
      curtainBusy = false;
    }, 1700);
  }

  if (!reduced) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a.nav__link, a.nav__cta, a.abt__cta');
      if (!a) return;
      const cfg = CURTAIN_LINKS[a.getAttribute('href') || ''];
      if (!cfg) return;
      // Only run our in-page curtain when the target section can exist on
      // THIS page. On another route (e.g. a /work/<id> gallery) the section
      // isn't here — leave the click alone so the bundle's router navigates
      // home. But on the home route the target may simply not have mounted
      // yet (our sections are injected async via observers): don't dead-end —
      // capture the click and retry for a beat until it appears.
      if (!document.querySelector(cfg.hash)) {
        if (location.pathname !== '/') return; // genuine off-home link → let bundle route home
        e.preventDefault();
        e.stopPropagation();
        let tries = 0;
        const waitFor = () => {
          if (document.querySelector(cfg.hash)) { if (!curtainBusy) curtainTo(cfg.label, cfg.hash); }
          else if (tries++ < 40) requestAnimationFrame(waitFor);
        };
        waitFor();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (!curtainBusy) curtainTo(cfg.label, cfg.hash);
    }, true);
  }

  // ---- about: "what defines us" as a playful centred statement --------
  // Reference: big serif statement with small inline doodle icons, curly
  // hand-drawn arrows pointing into a dashed box (highlighted label +
  // question + small CTA), and an uppercase sign-off line underneath.
  // Replaces the bundle's about section; takes over its #about anchor.
  function abtHtml() {
    return '' +
      '<span class="abt__kicker"><i></i>(01) &mdash; what defines us</span>' +
      '<p class="abt__statement">Nazariya is a multimedia agency built on the belief that perspective defines identity &mdash; crafting branding, websites, content &amp; campaigns the world remembers</p>' +
      '<svg class="abt__arrow abt__arrow--l" viewBox="0 0 120 190" fill="none" aria-hidden="true">' +
        '<path d="M78 6 C 18 20, 8 62, 42 74 C 66 82, 74 58, 52 52 C 26 46, 10 84, 30 118 C 44 142, 66 152, 92 150" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M78 138 L96 151 L80 164" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<svg class="abt__arrow abt__arrow--r" viewBox="0 0 110 190" fill="none" aria-hidden="true">' +
        '<path d="M18 8 C 78 26, 104 70, 74 108 C 62 122, 46 132, 30 138" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M46 126 L26 140 L44 154" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<div class="abt__box">' +
        '<span class="abt__label">before you scroll any further</span>' +
        '<h3 class="abt__q">Want to see what the right perspective could do for your brand?!</h3>' +
        '<a class="abt__cta" href="/#connect" data-hover>let&rsquo;s talk</a>' +
      '</div>' +
      '<p class="abt__foot">let&rsquo;s figure this brand thing out together</p>';
  }

  function mountAbout() {
    const legacy = document.querySelector('main > section.about');
    if (!legacy || document.querySelector('.abt')) return;
    legacy.id = 'about-legacy';
    const sec = document.createElement('section');
    sec.className = 'abt';
    sec.id = 'about';
    sec.setAttribute('aria-label', 'What defines us');
    sec.innerHTML = abtHtml();
    legacy.parentNode.insertBefore(sec, legacy.nextSibling);
  }

  // ---- by-the-numbers: animated stat band injected right after About --
  function statsHtml() {
    return '' +
      '<div class="abtstats__inner">' +
        '<div class="abtstats__grid">' +
          '<div class="abtstats__item">' +
            '<span class="abtstats__num" data-target="10000" data-suffix="+">0</span>' +
            '<span class="abtstats__label">content delivered</span>' +
          '</div>' +
          '<span class="abtstats__div" aria-hidden="true"></span>' +
          '<div class="abtstats__item">' +
            '<span class="abtstats__num" data-target="50" data-suffix="+">0</span>' +
            '<span class="abtstats__label">brands worked with</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const fmt = function (n) { return n.toLocaleString('en-US') + suffix; };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = fmt(target); return; }
    const dur = 1900;
    let t0 = 0;
    function step(now) {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
    // safety net: if rAF is throttled (background tab), still land the final value
    setTimeout(function () { el.textContent = fmt(target); }, dur + 400);
  }
  function mountStats() {
    if (document.getElementById('nz-stats')) return;
    const about = document.querySelector('#about.abt');
    const services = document.getElementById('services');
    // wait until BOTH exist as siblings, then slot the band right before
    // Services (= right after About), independent of mount order.
    if (!about || !services || about.parentNode !== services.parentNode) return;
    const sec = document.createElement('section');
    sec.className = 'abtstats';
    sec.id = 'nz-stats';
    sec.setAttribute('aria-label', 'By the numbers');
    sec.innerHTML = statsHtml();
    services.parentNode.insertBefore(sec, services);
    window.dispatchEvent(new Event('resize'));
    const nums = sec.querySelectorAll('.abtstats__num');
    // Lenis smooth-scroll makes IntersectionObserver / scroll events unreliable
    // here, so rAF-poll the band's position (same tactic as the nav tick).
    let started = false;
    (function watch() {
      if (started) return;
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.82 && r.bottom > vh * 0.12) {
        started = true;
        nums.forEach(countUp);
        return;
      }
      setTimeout(watch, 200);
    })();
  }

  // ---- footer: "let's connect" rebuilt as a cream card on maroon ------
  // Reference: brand mark + tagline and link columns on the maroon field,
  // credit line, then a large rounded cream card holding a giant wordmark,
  // a "work together?" pill, Newsletter heading + email field, note text
  // and social icons. Replaces the bundle's contact section (hidden via
  // CSS); takes over its #connect anchor so nav links keep working.
  const FTR_EMAIL = 'nazariya.co.in@gmail.com';

  function ftrHtml() {
    return '' +
      '<div class="ftr__top">' +
        '<div class="ftr__brand">' +
          '<img src="/brand/mark-cream.jpg" alt="Nazariya" width="46" height="46">' +
          '<span class="ftr__name">Nazariya</span>' +
        '</div>' +
        '<nav class="ftr__cols" aria-label="Footer">' +
          '<div class="ftr__col">' +
            '<a href="/#about">about</a>' +
            '<a href="/#services">services</a>' +
          '</div>' +
          '<div class="ftr__col">' +
            '<a href="tel:+918796797254">+91 8796797254</a>' +
            '<a href="mailto:' + FTR_EMAIL + '">' + FTR_EMAIL + '</a>' +
          '</div>' +
        '</nav>' +
      '</div>' +
      '<div class="ftr__card">' +
        '<a class="ftr__cta" href="mailto:' + FTR_EMAIL + '" data-hover>work together?</a>' +
        '<h3 class="ftr__nl">Perspective box</h3>' +
        '<form class="ftr__form" novalidate>' +
          '<input class="ftr__input" type="email" name="email" placeholder="email" autocomplete="email" aria-label="Your email">' +
          '<button class="ftr__send" type="submit" aria-label="Sign up">&#10230;</button>' +
        '</form>' +
        '<p class="ftr__note">Tell us what you&rsquo;re building, or what&rsquo;s stopping you.</p>' +
        '<a class="ftr__ig" href="https://instagram.com/aka.nazariya" target="_blank" rel="noreferrer" data-hover>@aka.nazariya</a>' +
        '<div class="ftr__socials">' +
          '<a href="https://instagram.com/aka.nazariya" target="_blank" rel="noreferrer" aria-label="Instagram">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/></svg></a>' +
          '<a href="mailto:' + FTR_EMAIL + '" aria-label="Email">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg></a>' +
          '<a href="tel:+918796797254" aria-label="Phone">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l1.6 4.2-2.2 1.6a13 13 0 0 0 5.8 5.8l1.6-2.2L20 15v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 6.2 2 2 0 0 1 5 4z"/></svg></a>' +
        '</div>' +
      '</div>' +
      '<p class="ftr__fine">we promise, it changes everything without changing anything.</p>' +
      '<p class="ftr__credit">&copy; 2026 Nazariya &mdash; perspective defines identity.</p>';
  }

  function mountFooter() {
    const legacy = document.querySelector('main > section.contact');
    if (!legacy || document.querySelector('.ftr')) return;
    legacy.id = 'connect-legacy';
    const sec = document.createElement('section');
    sec.className = 'ftr';
    sec.id = 'connect';
    sec.setAttribute('aria-label', "Let's connect");
    sec.innerHTML = ftrHtml();
    legacy.parentNode.insertBefore(sec, legacy.nextSibling);

    // newsletter has no backend: open a prefilled email instead
    sec.querySelector('.ftr__form').addEventListener('submit', function (e) {
      e.preventDefault();
      const v = sec.querySelector('.ftr__input').value.trim();
      location.href = 'mailto:' + FTR_EMAIL +
        '?subject=' + encodeURIComponent('Newsletter signup') +
        '&body=' + encodeURIComponent('Hi Nazariya, please add ' + (v || 'me') + ' to the newsletter.');
    });
  }

  // Mount — and RE-mount — whenever the home hero appears. This is a SPA:
  // navigating to /work unmounts our hero, and coming back home renders a
  // fresh <section.hero> that must be re-dressed, or the home hero returns
  // blank. A one-shot mount only worked on the very first load. mount() is
  // idempotent (bails if a .hero-v2 already exists), so it's safe to call
  // on every relevant DOM change.
  let refreshT = 0;
  function ensureHero() {
    const main = document.querySelector('main');
    if (main && main.querySelector('section.hero')) mount(main);
    const had = !!document.querySelector('.abt') && !!document.querySelector('.ftr');
    mountAbout();
    mountStats();
    mountFooter();
    if (!had && document.querySelector('.abt')) {
      // our injected sections change the page height AFTER the bundle's
      // ScrollTrigger measured it, so its scroll-linked reveals (e.g. the
      // services shelf) fire at stale offsets. A resize event makes GSAP
      // re-measure. Fire a few times to catch late layout (fonts/images).
      clearTimeout(refreshT);
      const kick = () => window.dispatchEvent(new Event('resize'));
      kick();
      refreshT = setTimeout(kick, 600);
      setTimeout(kick, 2000);
    }
  }
  ensureHero();
  new MutationObserver(ensureHero).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

/* -------------------------------------------------------------------------
   Logo goes light while the fixed header overlaps a red hero (.wcat__hero,
   on /work/<id> and the all-work page). Toggles .nav-on-red on <html> (CSS
   recolours the wordmark) and swaps the brand mark to its cream version.
   rAF-polled so it tracks scroll regardless of Lenis's scroll mechanism.
   ------------------------------------------------------------------------- */
(() => {
  const root = document.documentElement;
  const MARK_DARK = '/brand/mark-red.jpg';   // red disc — for cream pages
  const MARK_LIGHT = '/brand/mark-cream.jpg'; // cream disc — for red pages
  let on = null;
  function tick() {
    let red = false;
    const heroes = document.querySelectorAll('.wcat__hero');
    for (let i = 0; i < heroes.length; i++) {
      const r = heroes[i].getBoundingClientRect();
      if (r.top <= 44 && r.bottom >= 44) { red = true; break; }  // spans the nav band
    }
    if (red !== on) {
      on = red;
      root.classList.toggle('nav-on-red', red);
      const mark = document.querySelector('.nav__mark, .nav__logo img');
      if (mark) mark.setAttribute('src', red ? MARK_LIGHT : MARK_DARK);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
