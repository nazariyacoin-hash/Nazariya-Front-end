/* ---------------------------------------------------------
   gallery perf — the work reel renders many muted-loop videos.
   Left to autoplay they ALL buffer at once (each also duplicated
   by the marquee = ~32 fetches, ~120MB) and starve the images on
   the browser's connection pool, so photos load late.
   The bundle now renders reel videos with preload="none" and no
   autoplay; here we play ONLY the videos currently visible in the
   marquee and pause the rest — so off-screen and duplicate videos
   never fetch, and images get the bandwidth immediately.
   --------------------------------------------------------- */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // play when a tile is near the viewport, pause once it leaves
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting && !reduced) {
        if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { root: null, rootMargin: '200px', threshold: 0.05 });

  // Force reel IMAGES to load as they approach the viewport. Native
  // loading="lazy" is unreliable inside the GSAP transform marquee — tiles
  // laid out far along the wide track never trigger the browser's lazy
  // heuristic even when the animation scrolls them into view, so they stay
  // blank. This kicks each image's load just before it enters, reliably.
  const imgIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target;
      if (!img.complete) img.loading = 'eager';   // trigger the fetch now
      imgIO.unobserve(img);                        // load once, then done
    }
  }, { root: null, rootMargin: '500px', threshold: 0 });

  const seen = new WeakSet();
  const seenImg = new WeakSet();
  function scan() {
    const vids = document.querySelectorAll('.mreel-tile video');
    for (const v of vids) {
      if (seen.has(v)) continue;
      seen.add(v);
      // videos autoplay natively (muted) once scrolled into view; the browser
      // defers off-screen ones. Keep them muted/looping and let the IO below
      // pause any that leave the viewport for extra perf — but DON'T strip
      // autoplay or force preload:none, or they never start (the marquee's
      // transform makes the IO's own play() unreliable).
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      io.observe(v);
    }
    const imgs = document.querySelectorAll('.mreel-tile img');
    for (const im of imgs) {
      if (seenImg.has(im)) continue;
      seenImg.add(im);
      if (im.complete && im.naturalWidth > 0) continue;   // already loaded
      imgIO.observe(im);
    }
    armCatchAll();
  }

  // catch-all: the marquee cycles every tile through view anyway, so a few
  // seconds after the reel (re)mounts, force-load any image the observer
  // hasn't already picked up. Guarantees no tile stays permanently blank,
  // regardless of scroll position, observer timing, or tab throttling.
  let catchAll = 0;
  function armCatchAll() {
    clearTimeout(catchAll);
    catchAll = setTimeout(() => {
      document.querySelectorAll('.mreel-tile img').forEach((im) => {
        if (!(im.complete && im.naturalWidth > 0)) im.loading = 'eager';
      });
    }, 4000);
  }

  // coalesce bursts of DOM mutations into a single scan per frame
  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  }

  scan();
  // reel mounts/re-renders on SPA navigation — pick up new video tiles
  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
