/* AquaCity — anime.js (v4.5) details layered on the GSAP motion system.
   GSAP owns page choreography; anime.js adds the small physical things the site lacked:
   - droplets that actually travel the pipes (motion paths)
   - a sliding highlight for tab groups (spring)
   - ripples where you touch the water
   - springy acknowledgement when a slider value or an option changes
   Everything is optional: without this file the site behaves exactly as before. */
(function () {
  if (!window.anime) return;
  const { animate, createMotionPath, stagger, spring } = window.anime;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => rmq.matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';
  let running = [];     // animations owned by the current view
  let timers = [];
  const own = a => { running.push(a); return a; };
  const canvasScale = () => ($('#canvas').getBoundingClientRect().width / 1536) || 1;

  /* ---------- Droplets along the pipes ---------- */
  const pointsOf = d => (d.match(/-?\d*\.?\d+/g) || []).map(Number).reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);
  function source(page) {
    // water leaves from the reservoir: the label that names one marks where the flow starts
    const chip = $$(':scope > .label-chip', page).find(c => /reservoir/i.test(c.textContent));
    return chip ? [chip.offsetLeft + chip.offsetWidth / 2, chip.offsetTop + chip.offsetHeight] : null;
  }
  function droplets(page) {
    const svg = $('.network', page); if (!svg) return;
    const main = $('path', svg); if (!main) return;
    const from = source(page);
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    // the network is drawn as one path of several runs; each run becomes its own track
    const runs = main.getAttribute('d').split(/(?=M)/).map(s => s.trim()).filter(Boolean).map(d => {
      let pts = pointsOf(d);
      if (from && dist(pts[pts.length - 1], from) < dist(pts[0], from)) pts = pts.reverse();
      return 'M' + pts.map(p => p.join(' ')).join('L');
    });
    const layer = document.createElementNS(SVGNS, 'g'); layer.setAttribute('class', 'droplets');
    svg.insertBefore(layer, main.nextSibling);
    runs.forEach(d => {
      const track = document.createElementNS(SVGNS, 'path');
      track.setAttribute('d', d); track.setAttribute('class', 'drop-track');
      layer.appendChild(track);
      const len = track.getTotalLength();
      const count = Math.max(1, Math.round(len / 110));
      const period = (len / 85) * 1000;
      for (let i = 0; i < count; i++) {
        const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'drop');
        g.innerHTML = '<circle class="drop-halo" r="8"/><circle class="drop-core" r="3.6"/>';
        g.style.opacity = 0;
        layer.appendChild(g);
        const { translateX, translateY } = createMotionPath(track);
        const edge = Math.min(0.12, 260 / period);   // fade in and out at the ends of the run
        own(animate(g, {
          translateX, translateY,
          opacity: [{ to: 1, duration: period * edge }, { to: 1, duration: period * (1 - edge * 2) }, { to: 0, duration: period * edge }],
          duration: period, ease: 'linear', loop: true,
          delay: (period / count) * i   // droplets join one after another, never in unison
        }));
      }
    });
    leakSpray(svg);
  }
  function leakSpray(svg) {
    const leak = $('circle.leak', svg); if (!leak) return;
    const cx = +leak.getAttribute('cx'), cy = +leak.getAttribute('cy');
    const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'spray');
    svg.appendChild(g);
    const burst = () => {
      // no new drops while the tab is hidden (animations pause, the interval would not)
      if (document.hidden || !g.isConnected) return;
      for (let i = 0; i < 3; i++) {
        const d = document.createElementNS(SVGNS, 'circle');
        d.setAttribute('class', 'spray-drop'); d.setAttribute('cx', cx); d.setAttribute('cy', cy); d.setAttribute('r', 2.6);
        g.appendChild(d);
        const dx = (Math.random() - 0.5) * 34, up = 10 + Math.random() * 14;
        // short-lived and self-removing, so these are not tracked in `running`
        animate(d, {
          translateX: [0, dx],
          translateY: [{ from: 0, to: -up, duration: 320, ease: 'out(2)' }, { to: 14, duration: 520, ease: 'in(2)' }],
          opacity: [{ from: 0.95, to: 0.95, duration: 500 }, { to: 0, duration: 340 }],
          delay: i * 90,
          onComplete: () => d.remove()
        });
      }
    };
    burst();
    timers.push(setInterval(burst, 900));
  }

  /* ---------- Sliding highlight for tab groups ---------- */
  function placePill(tabs, instant) {
    const pill = $('.tab-pill', tabs); const active = $('.tab.active', tabs);
    if (!pill || !active) return;
    const underline = tabs.closest('.crisis-tabs');
    const x = active.offsetLeft, w = active.offsetWidth;
    if (underline) Object.assign(pill.style, { top: active.offsetTop + active.offsetHeight - 3 + 'px', height: '3px' });
    else Object.assign(pill.style, { top: active.offsetTop + 'px', height: active.offsetHeight + 'px' });
    // the pill carries a white copy of the labels, shifted so it lines up with the real ones:
    // whatever the pill covers reads white on green, everything else dark on cream — on every frame
    const ghost = $('.tab-ghost', pill);
    const paint = () => {
      if (!ghost) return;
      const px = new DOMMatrixReadOnly(getComputedStyle(pill).transform).m41 || 0;
      ghost.style.transform = `translate(${-px}px, ${-active.offsetTop}px)`;
    };
    if (instant || reduced()) { pill.style.transform = `translateX(${x}px)`; pill.style.width = w + 'px'; paint(); return; }
    pill.style.willChange = 'transform, width';
    animate(pill, { translateX: x, width: w, ease: spring({ bounce: 0.22, duration: 520 }),
      onUpdate: paint, onComplete: () => { pill.style.willChange = ''; paint(); } });
  }
  function tabPills(page) {
    $$('.tabs', page).forEach(tabs => {
      if (!$('.tab.active', tabs)) return;
      // only groups where the selection stays on this view; project tabs navigate away instead
      if ($('[data-action="project-tab"]', tabs)) return;
      const pill = document.createElement('span');
      pill.className = 'tab-pill'; pill.setAttribute('aria-hidden', 'true');
      if (!tabs.closest('.crisis-tabs')) {
        const ghost = document.createElement('span'); ghost.className = 'tab-ghost';
        ghost.style.width = tabs.clientWidth + 'px'; ghost.style.height = tabs.clientHeight + 'px';
        ghost.innerHTML = $$('.tab', tabs).map(t => `<span class="ghost-tab" style="left:${t.offsetLeft}px;top:${t.offsetTop}px;width:${t.offsetWidth}px;height:${t.offsetHeight}px">${t.innerHTML}</span>`).join('');
        pill.appendChild(ghost);
      }
      tabs.prepend(pill); tabs.classList.add('has-pill');
      placePill(tabs, true);
    });
    document.fonts?.ready.then(() => $$('.tabs.has-pill', page).forEach(t => placePill(t, true)));
  }

  /* ---------- Ripples where you touch the water ---------- */
  const maskCache = {};
  function maskFor(name) {
    const m = (window.AQUA_WATER_MASKS || {})[name]; if (!m) return null;
    if (!maskCache[name]) { const raw = atob(m.d); maskCache[name] = { ...m, bytes: Uint8Array.from(raw, c => c.charCodeAt(0)) }; }
    return maskCache[name];
  }
  const resolveLen = (v, box, rendered) => v.endsWith('%') ? (box - rendered) * parseFloat(v) / 100 : parseFloat(v) || 0;
  function isWater(scene, px, py) {
    // px, py: point in page coordinates. Undo the camera transform, then the background crop.
    const img = $('.scene-img', scene) || scene;
    const name = (getComputedStyle(img).backgroundImage.match(/assets\/([\w-]+)-scene\./) || [])[1];
    const mask = name && maskFor(name); if (!mask) return false;
    const W = scene.offsetWidth, H = scene.offsetHeight;
    const s = window.gsap ? gsap.getProperty(img, 'scale') || 1 : 1;
    const tx = window.gsap ? gsap.getProperty(img, 'x') : 0, ty = window.gsap ? gsap.getProperty(img, 'y') : 0;
    let lx = (px - scene.offsetLeft - W / 2 - tx) / s + W / 2;
    let ly = (py - scene.offsetTop - H / 2 - ty) / s + H / 2;
    const cs = getComputedStyle(img);
    const aspect = mask.h / mask.w;   // image aspect, from the mask grid
    let [sw, sh] = cs.backgroundSize.split(' ');
    let rw, rh;
    if (sw === 'cover') { rw = Math.max(W, H / aspect); rh = rw * aspect; }
    else {
      rw = sw.endsWith('%') ? W * parseFloat(sw) / 100 : parseFloat(sw);
      rh = !sh || sh === 'auto' ? rw * aspect : sh.endsWith('%') ? H * parseFloat(sh) / 100 : parseFloat(sh);
    }
    const [bx, by] = cs.backgroundPosition.split(' ');
    let u = (lx - resolveLen(bx, W, rw)) / rw, v = (ly - resolveLen(by || '50%', H, rh)) / rh;
    if (/repeat-y|^repeat$/.test(cs.backgroundRepeat)) v = ((v % 1) + 1) % 1;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const i = Math.floor(v * mask.h) * mask.w + Math.floor(u * mask.w);
    return !!(mask.bytes[i >> 3] & (128 >> (i & 7)));
  }
  function ripple(page, scene, e) {
    if (reduced()) return;
    const r = page.getBoundingClientRect(); const s = canvasScale();
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    if (!isWater(scene, x, y)) return;
    const host = document.createElement('div');
    host.className = 'ripple'; host.setAttribute('aria-hidden', 'true');
    host.style.left = x + 'px'; host.style.top = y + 'px';
    host.innerHTML = '<i></i><i></i><i></i>';
    page.appendChild(host);
    animate(host.children, {
      scale: [0.08, 1], opacity: [{ from: 0.95, to: 0.95, duration: 250 }, { to: 0, duration: 1150 }],
      duration: 1400, delay: stagger(170), ease: 'out(3)',
      onComplete: () => host.remove()
    });
  }

  /* ---------- Springy acknowledgement ---------- */
  function bump(el, from = 1.08) {
    if (!el || reduced()) return;
    animate(el, { scale: [from, 1], ease: spring({ bounce: 0.2, duration: 360 }) });
  }

  /* ---------- Wiring ---------- */
  document.addEventListener('aquamotion:enter', ({ detail }) => {
    running.forEach(a => a.cancel()); running = [];
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    const { page, settle } = detail;
    tabPills(page);
    if (!reduced()) timers.push(setTimeout(() => droplets(page), settle * 1000));
  });

  rmq.addEventListener?.('change', e => { if (e.matches) { running.forEach(a => a.cancel()); running = []; timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; $$('.droplets, .spray').forEach(n => n.remove()); } });

  document.addEventListener('click', e => {
    const page = $('#page');
    const tab = e.target.closest('.tab');
    // app.js updates the active tab in its own click handler; read the result next frame
    if (tab) requestAnimationFrame(() => { const tabs = tab.closest('.tabs'); if (tabs) placePill(tabs); });
    // the network overlay ignores the pointer, so a click on the art arrives at .scene
    const scene = e.target.closest('.scene');
    if (scene && page.contains(scene)) ripple(page, scene, e);
  });

  document.addEventListener('change', e => {
    const input = e.target;
    if (!input.matches('input[type="range"]')) return;
    const out = input.dataset.output ? document.getElementById(input.dataset.output) : (input.nextElementSibling?.tagName === 'OUTPUT' ? input.nextElementSibling : null);
    bump(out, 1.08);
  });

  document.addEventListener('change', e => {
    const input = e.target;
    if (!input.matches('.option input[type="radio"], .option input[type="checkbox"]')) return;
    bump(input, 0.8);
    bump(input.closest('.option'), 0.985);
  });

  addEventListener('resize', () => $$('.tabs.has-pill').forEach(t => placePill(t, true)));
})();
