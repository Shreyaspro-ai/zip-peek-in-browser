/* AquaCity motion layer (GSAP 3.13).
   Motion thesis — "the tide": every view arrives the way water does. The scenic art rises
   behind a bright waterline, the title surfaces line by line, and the data settles in after it.
   Supporting motion only explains state: a liquid nav indicator for "where am I", count-ups and
   draw-ins for "data arriving", flowing pulses for "water moving through the network", a pulsing
   ring for "leak here", and a draggable before/after divider for "compare".
   Content is fully visible without this file; it only animates *from* hidden states. */
(function () {
  if (!window.gsap) return;
  const { gsap } = window;
  gsap.registerPlugin(SplitText, DrawSVGPlugin, Draggable, InertiaPlugin);
  gsap.defaults({ ease: 'expo.out' });

  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let reduced = rmq.matches;
  const loops = [];       // infinite ambient tweens, stopped if reduced motion is switched on
  rmq.addEventListener?.('change', e => {
    reduced = e.matches;
    if (reduced) { parallax = null; loops.splice(0).forEach(t => t.kill()); }
  });

  let pageCtx = null;     // gsap.context for the current view — reverted on every navigation
  let leaving = null;     // the outgoing timeline, so a fast second click can interrupt it
  let firstLoad = true;
  const visited = new Set(); // views seen this session get a short entrance
  let parallax = null;    // quickTo setters for the current view
  let cleanups = [];      // listeners/tickers owned by the current view

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const canvasScale = () => { const c = $('#canvas'); return c.getBoundingClientRect().width / 1536 || 1; };
  const staggerAmount = (n, each, max) => Math.min(max, Math.max(0, n - 1) * each);

  /* ---------------- Sidebar: liquid indicator ---------------- */
  function moveIndicator(instant) {
    const nav = $('.nav'); const ind = $('.nav-indicator'); const a = $('.nav a.active');
    if (!nav || !ind || !a) return;
    $('#sidebar').classList.add('has-indicator');
    const y = a.offsetTop, h = a.offsetHeight, w = a.offsetWidth, x = a.offsetLeft;
    const from = gsap.getProperty(ind, 'y');
    gsap.set(ind, { height: h, left: x, right: 'auto', opacity: 1 });
    if (instant || reduced) { gsap.set(ind, { y, width: w }); return; }
    const dist = Math.abs(y - from);
    gsap.to(ind, { y, width: w, duration: 0.7, overwrite: 'auto' });
    // a droplet stretches as it slides, then settles
    gsap.timeline({ overwrite: 'auto' })
      .to(ind, { scaleY: 1 + Math.min(0.55, dist / 700), scaleX: 0.95, duration: 0.18, ease: 'power2.out' })
      .to(ind, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'expo.out' });
  }

  /* ---------------- Scene: split into a parallax-able art layer ---------------- */
  function buildSceneLayers(scene) {
    if (!scene) return null;
    if (scene.classList.contains('has-art')) return $('.scene-img', scene);
    const cs = getComputedStyle(scene);
    const art = document.createElement('div'); art.className = 'scene-art';
    const img = document.createElement('div'); img.className = 'scene-img';
    // identical composition to the authored scene; depth comes from a transform, never a re-crop
    ['backgroundImage', 'backgroundRepeat', 'backgroundSize', 'backgroundPosition'].forEach(k => { img.style[k] = cs[k]; });
    art.appendChild(img); scene.prepend(art); scene.classList.add('has-art');
    return img;
  }

  /* Labels and the pipe network are drawn over places in the art, so they ride with the camera */
  function lockToArt(scene, img, page) {
    const w = scene.offsetWidth, h = scene.offsetHeight;
    const cx = scene.offsetLeft + w / 2, cy = scene.offsetTop + h / 2;
    const chips = $$(':scope > .label-chip, :scope > .cycle-label', page).map(el => ({
      el, dx: el.offsetLeft + el.offsetWidth / 2 - cx, dy: el.offsetTop + el.offsetHeight / 2 - cy }));
    const net = $('.network', page);
    if (net) net.style.transformOrigin = `${cx}px ${cy}px`;
    let last = '';
    const tick = () => {
      const s = gsap.getProperty(img, 'scale'), x = gsap.getProperty(img, 'x'), y = gsap.getProperty(img, 'y');
      const key = `${s.toFixed(4)}|${x.toFixed(2)}|${y.toFixed(2)}`;
      if (key === last) return; last = key;
      chips.forEach(c => gsap.set(c.el, { x: x + (s - 1) * c.dx, y: y + (s - 1) * c.dy }));
      if (net) net.style.transform = `translate(${x}px,${y}px) scale(${s})`;
    };
    gsap.ticker.add(tick); tick();
    return () => gsap.ticker.remove(tick);
  }

  /* ---------------- Tide reveal (the focal moment) ---------------- */
  function tide(tl, target, clipEl, at) {
    const page = $('#page');
    const t = document.createElement('div'); t.className = 'tide'; t.setAttribute('aria-hidden', 'true');
    Object.assign(t.style, { left: target.offsetLeft + 'px', top: target.offsetTop + 'px', width: target.offsetWidth + 'px', height: target.offsetHeight + 'px', zIndex: 1 });
    const line = document.createElement('div'); line.className = 'tide-line'; t.appendChild(line);
    page.appendChild(t);
    const H = target.offsetHeight; const o = { p: 1 };
    const apply = () => {
      clipEl.style.clipPath = `inset(${(o.p * 100).toFixed(2)}% 0 0 0)`;
      gsap.set(line, { y: o.p * H - 3 });
    };
    apply();
    tl.to(o, { p: 0, duration: 1.15, ease: 'power3.inOut', onUpdate: apply,
      onComplete: () => { clipEl.style.clipPath = ''; } }, at)
      .to(line, { autoAlpha: 0, duration: 0.35, ease: 'power1.out', onComplete: () => t.remove() }, at + 1.0);
    return t;
  }

  /* ---------------- Numbers that arrive ---------------- */
  const NUM = /^(\s*[^\d\-−+]*?)([\-−+]?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;
  function countUp(tl, el, at) {
    const node = Array.from(el.childNodes).find(n => n.nodeType === 3 && /\d/.test(n.nodeValue));
    if (!node) return;
    const m = node.nodeValue.match(NUM); if (!m) return;
    const [, pre, sign, raw, post] = m;
    const target = parseFloat(raw.replace(/,/g, ''));
    const decimals = (raw.split('.')[1] || '').length;
    const commas = raw.includes(',');
    const fmt = v => {
      let s = v.toFixed(decimals);
      if (commas) { const [i, d] = s.split('.'); s = Number(i).toLocaleString('en-US') + (d ? '.' + d : ''); }
      return pre + sign + s + post;
    };
    // screen readers hear the settled value, never the moving one
    const live = document.createElement('span'); live.setAttribute('aria-hidden', 'true');
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = fmt(target);
    node.replaceWith(live); live.appendChild(node); live.after(sr);
    const o = { v: 0 };
    node.nodeValue = fmt(0);
    tl.to(o, { v: target, duration: 1.3, ease: 'expo.out', onUpdate: () => { node.nodeValue = fmt(o.v); },
      onComplete: () => { node.nodeValue = fmt(target); } }, at);
  }

  /* ---------------- Charts and lines that draw ---------------- */
  function drawCharts(tl, root, at) {
    const strokes = $$('.chart polyline, svg[role="img"] path[fill="none"], .spark path[fill="none"]', root);
    if (strokes.length) tl.from(strokes, { drawSVG: '0%', duration: 1.4, ease: 'power2.inOut', stagger: { amount: staggerAmount(strokes.length, 0.06, 0.4) } }, at);
    const fills = $$('.chart polygon, .chart path:not([fill="none"]), .spark path:not([fill="none"])', root);
    if (fills.length) tl.from(fills, { opacity: 0, duration: 0.9, ease: 'power1.out' }, at + 0.5);
    const dots = $$('.chart circle', root);
    if (dots.length) tl.from(dots, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: { amount: 0.6 } }, at + 0.25);
  }

  /* ---------------- Water network ---------------- */
  function network(tl, root, at) {
    const svg = $('.network', root); if (!svg) return;
    const main = $('path', svg);
    const nodes = $$('circle', svg);
    tl.from(main, { drawSVG: '0%', duration: 1.5, ease: 'power2.inOut' }, at);
    tl.from(nodes.filter(n => !n.classList.contains('leak')), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)', stagger: { amount: 0.7 } }, at + 0.35);
    const leak = nodes.find(n => n.classList.contains('leak'));
    if (leak) tl.from(leak, { scale: 0, transformOrigin: '50% 50%', duration: 0.6 }, at + 1.1);
    tl.add(() => pageCtx.add(() => {
      // water moving through the pipes is drawn by motion-anime.js (droplets on motion paths)
      if (leak) {
        const ns = 'http://www.w3.org/2000/svg';
        for (let i = 0; i < 2; i++) {
          const ring = document.createElementNS(ns, 'circle');
          ring.setAttribute('cx', leak.getAttribute('cx')); ring.setAttribute('cy', leak.getAttribute('cy'));
          ring.setAttribute('r', leak.getAttribute('r') || 12); ring.setAttribute('class', 'leak-ring');
          leak.before(ring);
          loops.push(gsap.fromTo(ring, { scale: 1, opacity: 0.9 }, { scale: 3, opacity: 0, duration: 1.8, ease: 'power2.out', repeat: -1, delay: i * 0.9 }));
        }
      }
    }), at + 1.3);
  }

  /* ---------------- Before / after divider ---------------- */
  const chevrons = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  function setupCompare(root) {
    return $$('.compare', root).map(compare => {
      const handle = $('.compare-handle', compare); if (!handle) return null;
      const initial = parseFloat(compare.style.gridTemplateColumns) || 50;
      const hasBars = !!$('.compare-bar', compare);
      let min = initial - 6, max = initial + 6;   // safe until the images report their size
      // Each picture is a crop sized for its half. Freeze today's crop in pixels, anchored to the
      // outer edge, so dragging only reveals or covers — the city never slides or rescales.
      const [p1, p2] = $$(':scope > div:not(.compare-handle):not(.compare-spacer)', compare);
      const freeze = () => {
        const i1 = $('img', p1), i2 = $('img', p2);
        if (!i1?.naturalWidth || !i2?.naturalWidth) return;
        handle.style.bottom = 'auto'; handle.style.height = p1.offsetHeight + 'px';  // the divider spans the pictures only
        const W = compare.offsetWidth, H = p1.offsetHeight;
        const w1 = p1.offsetWidth, w2 = p2.offsetWidth;
        const rw1 = i1.naturalWidth * Math.max(w1 / i1.naturalWidth, H / i1.naturalHeight);
        const rw2 = i2.naturalWidth * Math.max(w2 / i2.naturalWidth, H / i2.naturalHeight);
        const o1 = (w1 - rw1) / 2, o2 = (w2 - rw2) / 2;
        i1.style.objectPosition = `${o1}px 50%`;
        i2.style.objectPosition = `right ${o2}px top 50%`;
        const lo = ((W - o2 - rw2) / W) * 100 + 1, hi = ((o1 + rw1) / W) * 100 - 1;
        min = Math.max(hasBars ? 34 : 14, Math.min(initial, lo));
        max = Math.min(hasBars ? 66 : 86, Math.max(initial, hi));
        grip.setAttribute('aria-valuemin', Math.round(min)); grip.setAttribute('aria-valuemax', Math.round(max));
      };
      // the old handle sat in its own grid row; a hidden spacer keeps that row so the images keep their height
      const spacer = document.createElement('div'); spacer.className = 'compare-spacer'; spacer.setAttribute('aria-hidden', 'true');
      compare.appendChild(spacer);
      handle.removeAttribute('aria-hidden'); handle.textContent = '';
      const grip = document.createElement('button');
      grip.type = 'button'; grip.className = 'compare-grip';
      grip.setAttribute('role', 'slider');
      grip.setAttribute('aria-label', 'Drag to compare before and after');
      grip.setAttribute('aria-valuemin', min); grip.setAttribute('aria-valuemax', max);
      grip.innerHTML = chevrons; handle.appendChild(grip);
      const state = { split: initial };
      const set = v => {
        state.split = gsap.utils.clamp(min, max, v);
        compare.style.setProperty('--split', state.split + '%');
        grip.setAttribute('aria-valuenow', Math.round(state.split));
        grip.setAttribute('aria-valuetext', `${Math.round(state.split)}% before, ${Math.round(100 - state.split)}% after`);
      };
      set(initial);
      [p1, p2].forEach(p => { const im = $('img', p); if (im && !im.complete) im.addEventListener('load', freeze, { once: true }); });
      freeze();
      const proxy = document.createElement('div');
      let startX = 0, startSplit = initial, target = initial;
      const fromDrag = function () {
        const w = compare.offsetWidth * canvasScale();
        set(startSplit + ((this.x - startX) / w) * 100);
      };
      const drag = Draggable.create(proxy, {
        trigger: grip, type: 'x', inertia: !reduced, allowContextMenu: true,
        onPress() { startX = this.x; gsap.killTweensOf(state); startSplit = target = state.split; grip.classList.add('dragging'); },
        onDragEnd() { target = state.split; },
        onRelease() { grip.classList.remove('dragging'); },
        onDrag: fromDrag, onThrowUpdate: fromDrag
      })[0];
      grip.addEventListener('keydown', e => {
        const step = e.shiftKey ? 10 : 2;
        const map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
        let next = null;
        if (e.key in map) next = gsap.utils.clamp(min, max, target + map[e.key]);
        if (e.key === 'Home') next = min;
        if (e.key === 'End') next = max;
        if (next === null) return;
        e.preventDefault();
        target = next;
        if (reduced) { gsap.killTweensOf(state); set(next); }
        else gsap.to(state, { split: next, duration: 0.35, overwrite: true, onUpdate: () => set(state.split) });
      });
      cleanups.push(() => drag.kill());
      const nudge = () => gsap.timeline({ onUpdate: () => set(state.split) })
        .to(state, { split: initial + 6, duration: 0.5, ease: 'power2.inOut' })
        .to(state, { split: initial, duration: 0.9, ease: 'expo.out' });
      grip.addEventListener('keydown', () => gsap.killTweensOf(state), { capture: true });
      return { compare, state, set, initial, nudge };
    }).filter(Boolean);
  }

  /* ---------------- Pointer depth parallax ---------------- */
  function onPointer(e) {
    if (!parallax) return;
    const nx = (e.clientX / innerWidth - 0.5) * 2;
    const ny = (e.clientY / innerHeight - 0.5) * 2;
    parallax.forEach(([fx, fy, mx, my]) => { fx(nx * mx); fy(ny * my); });
  }
  function onPointerLeave() { parallax && parallax.forEach(([fx, fy]) => { fx(0); fy(0); }); }
  addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  /* ---------------- Public API used by app.js ---------------- */
  const AquaMotion = {
    go(render) {
      const page = $('#page');
      if (leaving) { leaving.kill(); leaving = null; render(); return; }
      if (reduced) {
        leaving = gsap.to(page, { autoAlpha: 0, duration: 0.12, ease: 'power1.in', onComplete: () => { leaving = null; render(); } });
        return;
      }
      parallax = null;
      const parts = $$('#page > .box, #page > .heading, #page > .label-chip, #page > .cycle-label, #page > .compare', document);
      leaving = gsap.timeline({ onComplete: () => { leaving = null; render(); } })
        .to(parts, { autoAlpha: 0, y: -10, duration: 0.2, ease: 'power2.in', stagger: { amount: 0.05 } }, 0)
        .to($$('.scene', page), { autoAlpha: 0, duration: 0.24, ease: 'power2.in' }, 0);
    },

    enter(page, key) {
      cleanups.forEach(fn => fn && fn()); cleanups = [];
      loops.splice(0).forEach(t => t.kill());
      if (pageCtx) pageCtx.revert();
      gsap.set(page, { clearProps: 'opacity,visibility' });
      moveIndicator(firstLoad);
      const sceneEl = $('.scene', page);
      const sceneImg = buildSceneLayers(sceneEl);

      pageCtx = gsap.context(() => {}, page);
      pageCtx.add(() => {
        const compares = setupCompare(page);
        if (reduced) {
          gsap.from(page, { autoAlpha: 0, duration: 0.25, ease: 'power1.out' });
          parallax = null; firstLoad = false; visited.add(key);
          document.dispatchEvent(new CustomEvent('aquamotion:enter', { detail: { page, key, settle: 0 } }));
          return;
        }

        const quick = visited.has(key);
        visited.add(key);
        const tl = gsap.timeline();
        // base zoom gives the parallax room to travel without exposing an edge of the art
        const base = sceneEl && fine.matches ? 1 + 2 * Math.max(20 / sceneEl.offsetWidth, 14 / sceneEl.offsetHeight) : 1;
        if (sceneImg) { gsap.set(sceneImg, { scale: base }); cleanups.push(lockToArt(sceneEl, sceneImg, page)); }

        // 1 — first visit only: the shell settles in
        if (firstLoad) {
          tl.from($$('#sidebar .logo, #sidebar .nav a'), { autoAlpha: 0, x: -14, duration: 0.8, stagger: 0.03 }, 0)
            .from($$('#sidebar .nav-indicator'), { autoAlpha: 0, scaleX: 0.6, transformOrigin: '0% 50%', duration: 0.8 }, 0.35)
            .from($$('.sdgs > *'), { autoAlpha: 0, y: -12, duration: 0.8, stagger: 0.06 }, 0.2);
        }
        const t0 = firstLoad ? 0.15 : 0;

        // 2 — the tide: art rises behind a bright waterline
        const reveal = sceneEl || $('.compare', page);
        if (reveal) {
          const clipEl = sceneEl ? $('.scene-art', sceneEl) : reveal;
          tide(tl, reveal, clipEl, t0);
          if (sceneImg) tl.fromTo(sceneImg, { scale: base * 1.12 }, { scale: base, duration: 1.8, ease: 'expo.out' }, t0);
          else tl.from($$('img', reveal), { scale: 1.1, duration: 1.8, ease: 'expo.out' }, t0);
        }

        // 3 — the title surfaces line by line
        const h1 = $('.heading h1', page);
        if (h1) {
          const split = SplitText.create(h1, { type: 'lines', mask: 'lines', linesClass: 'h-line' });
          tl.from(split.lines, { yPercent: 108, duration: 0.95, stagger: 0.09 }, t0 + 0.08);
        }
        const sub = $$('.heading > p, .heading > .eyebrow', page);
        if (sub.length) tl.from(sub, { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.06 }, t0 + 0.25);

        // 4 — panels settle in reading order
        const boxes = $$(':scope > .box', page)
          .sort((a, b) => (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft));
        if (boxes.length) tl.from(boxes, { autoAlpha: 0, y: 28, duration: 0.8, stagger: { amount: staggerAmount(boxes.length, 0.06, 0.36) } }, t0 + 0.2);

        // 5 — place labels pop onto the map
        const chips = $$(':scope > .label-chip, :scope > .cycle-label', page);
        if (chips.length) tl.from(chips, { autoAlpha: 0, scale: 0.86, duration: 0.7, stagger: { amount: staggerAmount(chips.length, 0.06, 0.3) } }, t0 + 0.6);

        // 6 — data arrives: pictures wipe in, numbers count, bars fill, lines draw
        const pics = $$('.box img.picture, .box .priority img, .box .tool img', page);
        if (pics.length) tl.fromTo(pics, { clipPath: 'inset(0 0 0 100% round 9px)' }, { clipPath: 'inset(0 0 0 0% round 9px)', duration: 1, ease: 'expo.inOut', stagger: { amount: staggerAmount(pics.length, 0.05, 0.3) }, clearProps: 'clipPath' }, t0 + 0.35);
        if (!quick) $$('.stat .value, .outcome strong, .compare-bar .value', page).forEach((el, i) => countUp(tl, el, t0 + 0.45 + Math.min(i * 0.04, 0.3)));
        const bars = $$('.box .track > span, .label-chip .track > span', page);
        if (bars.length) tl.from(bars, { scaleX: 0, duration: 1.3, stagger: { amount: staggerAmount(bars.length, 0.04, 0.4) } }, t0 + 0.5);
        drawCharts(tl, page, t0 + 0.5);
        network(tl, page, t0 + 0.55);
        const medals = $$('.medal', page);
        if (medals.length) tl.from(medals, { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: 'back.out(1.4)', stagger: 0.06 }, t0 + 0.8);

        // 7 — the before/after divider nudges once so people know it moves
        if (!quick) compares.forEach(c => tl.add(() => pageCtx.add(c.nudge), t0 + 1.1));

        // 8 — once settled: depth parallax + a slow breathing camera on the art (desktop pointers only;
        // skipped under the live pipe network so the glowing overlay is not repainted every frame)
        tl.add(() => pageCtx.add(() => {
          if (!sceneImg || !fine.matches || reduced) return;
          if (!$('.network', page)) loops.push(gsap.to(sceneImg, { scale: base * 1.03, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
          parallax = [[gsap.quickTo(sceneImg, 'x', { duration: 1.4, ease: 'power3' }), gsap.quickTo(sceneImg, 'y', { duration: 1.4, ease: 'power3' }), -18, -12]];
        }), t0 + 1.4);
        // a view already seen this session replays in ~0.5s: orientation without the wait
        if (quick) tl.timeScale(3.2);
        // hand-off for motion-anime.js: when the network has finished drawing, water can flow
        document.dispatchEvent(new CustomEvent('aquamotion:enter', { detail: { page, key, settle: (t0 + 1.9) / (quick ? 3.2 : 1) } }));
      });
      firstLoad = false;
    },

    panelIn(el) {
      if (!el) return;
      gsap.killTweensOf(el); el._closing = false;
      const opener = document.activeElement;
      if (opener && opener !== document.body && !el.contains(opener)) el._opener = opener;
      if (reduced) { gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, clearProps: 'opacity,visibility' }); return; }
      const tl = gsap.timeline();
      tl.fromTo(el, { autoAlpha: 0, y: 18, scale: 0.985, transformOrigin: '50% 0%' }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, clearProps: 'transform,opacity,visibility' });
      const pics = $$('img.picture', el);
      if (pics.length) tl.fromTo(pics, { clipPath: 'inset(0 0 0 100% round 9px)' }, { clipPath: 'inset(0 0 0 0% round 9px)', duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.05);
      const kids = $$(':scope > *:not(.close)', el);
      tl.from(kids, { autoAlpha: 0, y: 8, duration: 0.5, stagger: { amount: staggerAmount(kids.length, 0.03, 0.25) }, clearProps: 'transform,opacity,visibility' }, 0.06);
      const bars = $$('.track > span', el);
      if (bars.length) tl.from(bars, { scaleX: 0, duration: 1.1 }, 0.2);
    },

    hide(el) {
      if (!el || el.classList.contains('hidden') || el._closing) return;
      if (el.contains(document.activeElement)) {
        const back = el._opener && el._opener.isConnected ? el._opener : $('#page h1');
        if (back) { if (!back.matches('a,button,input,[tabindex]')) back.setAttribute('tabindex', '-1'); back.focus({ preventScroll: true }); }
      }
      gsap.killTweensOf(el); el._closing = true;
      gsap.to(el, { autoAlpha: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.985, duration: reduced ? 0.12 : 0.2, ease: 'power2.in',
        onComplete: () => { el._closing = false; el.classList.add('hidden'); gsap.set(el, { clearProps: 'transform,opacity,visibility' }); } });
    },

    show(el) {
      if (!el) return;
      const was = el.classList.contains('hidden') || el._closing;
      gsap.killTweensOf(el); el._closing = false;
      el.classList.remove('hidden');
      if (was) this.panelIn(el);
      else if (!reduced) gsap.fromTo(el, { scale: 0.98 }, { scale: 1, duration: 0.4, clearProps: 'transform' });
    }
  };

  // keep the indicator aligned if the canvas is rescaled
  addEventListener('resize', () => moveIndicator(true));
  window.AquaMotion = AquaMotion;
})();
