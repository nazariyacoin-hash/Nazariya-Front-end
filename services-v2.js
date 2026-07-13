/* ---------------------------------------------------------
   services v2 — cursor-driven service columns (Schbang-style)
   Mounted between the injected .abt and .ftr sections.
   Mechanics (matched to the reference recording):
   • the strip is wider than the viewport and drifts
     horizontally toward the cursor's x position (lerped)
   • the panel under the cursor floods with a colour that
     CYCLES through the brand palette on every new hover
     (same panel can flood red now and pink next time)
   • a black "view more" pill trails the cursor; the label
     inside slides like a ticker, faster while the pill moves
   • hovered panel opens its file-folder: 4 prints from its
     own work/ dir slide out of the folder mouth over the
     colour flood; clicking the folder opens that category's
     gallery page (/work/<id> — full page load, loader plays;
     only the /work INDEX page stays removed)
   --------------------------------------------------------- */
(() => {
  // each panel: [title, gallery route id, prints from its own work/ dir]
  // clicking the folder opens that category's gallery page (/work/<id>)
  const SERVICES = [
    // TODO: swap these 4 placeholders for real /work/branding/* images once branding work is added
    ['Branding &<br>Identity', 'branding', ['/work/packaging/heritage.jpg', '/work/packaging/the-glory.jpg', '/work/packaging/silent-conversations.jpg', '/work/packaging/reflections-of-the-soul.jpg']],
    ['Web &<br>Digital', 'web', ['/work/web/studio-woof.jpg', '/work/web/crevo-web.jpg', '/work/web/interlined-web.jpg', '/work/web/youfoundus.jpg']],
    ['Content<br>Production', 'content', ['/work/content/golgappa-1.jpg', '/work/content/semal-2.jpg', '/work/content/colours-1.jpg', '/work/content/texture-1.jpg']],
    ['Social<br>Media', 'social', ['/work/social/wrii-1.jpg', '/work/social/wrii-2.jpg', '/work/social/wrii-3.jpg', '/work/social/wrii-4.jpg']],
    ['Printing &<br>Collaterals', 'print', ['/work/print/dye-mag.jpg', '/work/print/zine-disha.jpg', '/work/print/mag-mockup.jpg', '/work/print/zine-ishita.jpg']],
    ['Design', 'packaging', ['/work/packaging/sabyasachi.jpg', '/work/packaging/cards-1.jpg', '/work/packaging/mcqueen.jpg', '/work/packaging/cards-2.jpg']],
  ];
  const COLOR_COUNT = 4;      // svc2__panel--c0..c3 in services-v2.css
  const DRIFT_LERP = 0.075;
  const PILL_LERP = 0.2;
  const TICK_BASE = 30;       // ticker px/s at rest
  const TICK_VEL = 1.1;       // extra ticker px/s per px/s of pill speed
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  function html() {
    const panels = SERVICES.map(([title, id, prints]) =>
      `<a class="svc2__panel" href="/work/${id}" aria-label="${title.replace('<br>', ' ')} — view all the work">
        <span class="svc2__bg" aria-hidden="true"></span>
        <h3 class="svc2__title">${title}</h3>
        <span class="svc2__folder" aria-hidden="true">
          <span class="svc2__fback"></span>${prints.map((p) =>
          `<img class="svc2__print" src="${p}" alt="" loading="lazy" decoding="async">`).join('')}
          <span class="svc2__ffront"></span>
        </span>
        <span class="svc2__go" aria-hidden="true">${ARROW}</span>
      </a>`).join('');
    return `
      <div class="svc2__head">
        <span class="svc2__kicker"><i></i>(02) &mdash; what we do</span>
      </div>
      <div class="svc2__vp${touch || reduced ? ' is-touch' : ''}">
        <div class="svc2__strip">${panels}</div>
      </div>
      <div class="svc2__pill" aria-hidden="true">
        <span class="svc2__pill-skin"><span class="svc2__pill-track"></span></span>
      </div>`;
  }

  function mount(abt) {
    const section = document.createElement('section');
    section.className = 'svc2';
    section.id = 'services';
    section.setAttribute('aria-label', 'What we do');
    section.innerHTML = html();
    abt.after(section);

    const vp = section.querySelector('.svc2__vp');
    const strip = section.querySelector('.svc2__strip');
    const panels = [...section.querySelectorAll('.svc2__panel')];
    const pill = section.querySelector('.svc2__pill');
    const track = section.querySelector('.svc2__pill-track');

    let active = null;
    let colorIdx = 0;

    function activate(panel) {
      if (active === panel) return;
      if (active) active.classList.remove('is-on');
      active = panel;
      if (!panel) return;
      for (let i = 0; i < COLOR_COUNT; i++) panel.classList.remove('svc2__panel--c' + i);
      panel.classList.add('svc2__panel--c' + (colorIdx++ % COLOR_COUNT), 'is-on');
      // colour class stays after deactivation so the fade-out keeps its hue
    }

    /* ---- touch / reduced-motion: native swipe, tap to open ---- */
    if (touch || reduced) {
      panels.forEach((p) => {
        p.addEventListener('click', (e) => {
          if (touch && active !== p) {
            e.preventDefault();          // first tap floods, second tap follows the link
            activate(p);
          }
        });
      });
      return;
    }

    /* ---- pointer mode: drift + hit-test + pill, all in one rAF ---- */
    track.textContent = 'view more  ·  '.repeat(10);
    const tickUnit = () => track.scrollWidth / 10 || 120;

    let rect = vp.getBoundingClientRect();
    let panelW = panels[0].offsetWidth;
    let maxOff = Math.max(0, strip.scrollWidth - vp.clientWidth);
    let off = 0, targetOff = 0;
    let inside = false;
    let lastX = 0, lastY = 0;
    let px = 0, py = 0;
    let tickOff = 0, unit = 0;
    let raf = 0, lastT = 0, inView = false;

    function measure() {
      rect = vp.getBoundingClientRect();
      panelW = panels[0].offsetWidth;
      maxOff = Math.max(0, strip.scrollWidth - vp.clientWidth);
      targetOff = Math.min(targetOff, maxOff);
      unit = tickUnit();
    }

    function frame(t) {
      raf = 0;
      if (!document.contains(vp)) return;   // section was re-rendered away
      const dt = Math.min((t - lastT) / 1000 || 0.016, 0.05);
      lastT = t;

      off += (targetOff - off) * DRIFT_LERP;
      strip.style.transform = 'translate3d(' + -off.toFixed(2) + 'px,0,0)';

      if (inside) {
        // hit-test from geometry: the strip slides under a resting cursor,
        // so mouseenter alone would miss panel changes mid-drift
        const idx = Math.floor((lastX - rect.left + off) / panelW);
        activate(panels[Math.max(0, Math.min(panels.length - 1, idx))]);

        const prevX = px, prevY = py;
        px += (lastX - px) * PILL_LERP;
        py += (lastY - py) * PILL_LERP;
        pill.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
        const vel = Math.hypot(px - prevX, py - prevY) / dt;
        tickOff = (tickOff + (TICK_BASE + vel * TICK_VEL) * dt) % unit;
        track.style.transform = 'translateX(' + -tickOff.toFixed(1) + 'px)';
      }

      if (inView && (inside || Math.abs(targetOff - off) > 0.3)) {
        raf = requestAnimationFrame(frame);
      }
    }
    const kick = () => { if (!raf && inView) { lastT = performance.now(); raf = requestAnimationFrame(frame); } };

    vp.addEventListener('pointerenter', (e) => {
      measure();
      inside = true;
      lastX = px = e.clientX;
      lastY = py = e.clientY;
      pill.classList.add('is-live');
      document.documentElement.classList.add('svc2-hover');
      kick();
    });
    vp.addEventListener('pointermove', (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      targetOff = Math.max(0, Math.min(1, (lastX - rect.left) / rect.width)) * maxOff;
      kick();
    });
    vp.addEventListener('pointerleave', () => {
      inside = false;
      activate(null);
      pill.classList.remove('is-live');
      document.documentElement.classList.remove('svc2-hover');
    });

    // keyboard: focusing a panel floods it and drifts it into view
    panels.forEach((p, i) => {
      p.addEventListener('focus', () => {
        if (!p.matches(':focus-visible')) return;
        measure();
        activate(p);
        targetOff = Math.max(0, Math.min(maxOff, i * panelW - (rect.width - panelW) / 2));
        inView = true;
        kick();
      });
      p.addEventListener('blur', () => {
        if (active === p && !inside) activate(null);
      });
    });

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) { measure(); kick(); }
    }).observe(vp);

    let rT = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(measure, 120);
    });
  }

  // Mount — and RE-mount on SPA navigation — once the injected about
  // section exists (hero-v2.js creates it; home page only). Same
  // observer pattern as hero-v2.js; mount() is effectively idempotent
  // because we bail whenever a .svc2 is already in the document.
  function ensure() {
    if (document.querySelector('.svc2')) return;
    const abt = document.querySelector('main section.abt');
    if (abt) {
      mount(abt);
      // our section changes the page height after the bundle's
      // ScrollTrigger measured it — a resize makes GSAP re-measure
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => window.dispatchEvent(new Event('resize')), 700);
      // If we just landed on home with the URL already pointing at this
      // strip (e.g. a "work" nav click from a gallery page routed home +
      // #services), the bundle's one-rAF hash scroll fired BEFORE this
      // section existed and gave up. #services now exists — re-assert it.
      if (location.hash === '#services') scrollToStrip();
    }
  }
  // Scroll to the strip the same way hero-v2's curtain does (native scroll,
  // which Lenis syncs to). Poll briefly so late layout (images above) settles.
  function scrollToStrip() {
    let tries = 0;
    const go = () => {
      const el = document.getElementById('services');
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
      if (tries++ < 6) setTimeout(go, 90);
    };
    requestAnimationFrame(go);
  }
  ensure();
  new MutationObserver(ensure).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
