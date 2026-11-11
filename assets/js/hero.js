// Inicio interactivo: panal que reacciona al mouse, logo vivo y título que rota.
// Si el visitante pidió "reducir movimiento" o falla el JS, el inicio queda estático como antes.
(() => {
  const hero = document.getElementById('top');
  const cv = document.getElementById('comb');
  if (!hero || !cv || !cv.getContext) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = cv.getContext('2d');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ptr = { x: 0, y: 0, active: false, last: 0 };
  const ripples = [];
  let hexes = [], W = 0, H = 0, R = 30;

  /* ---------- Puntero: mouse real o piloto automático (celular / mouse quieto) ---------- */
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.active = true; ptr.last = performance.now();
  });
  hero.addEventListener('pointerleave', () => { ptr.active = false; });
  hero.addEventListener('pointerdown', (e) => {
    const r = hero.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
  });
  const usingAuto = (now) => coarse || !ptr.active || now - ptr.last > 3500;
  const autopilot = (now) => {
    const s = now / 1000;
    return { x: W * (0.5 + 0.38 * Math.sin(s * 0.42)), y: H * (0.5 + 0.32 * Math.sin(s * 0.67 + 1.2)) };
  };

  /* ---------- Panal ---------- */
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = W < 600 ? 24 : 30;
    const hw = Math.sqrt(3) * R, vh = 1.5 * R;
    hexes = [];
    for (let row = -1; row * vh < H + R * 2; row++) {
      const y = row * vh, off = (row & 1) ? hw / 2 : 0;
      for (let x = -hw + off; x < W + hw; x += hw) hexes.push({ x, y, v: 0 });
    }
  }
  function hexPath(x, y, r) {
    ctx.moveTo(x, y - r);
    for (let k = 1; k < 6; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 3;
      ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
  }
  // Azul #6FA3F5 a violeta #A98CF0 según la posición horizontal
  const colorAt = (t) => [111 + 58 * t, 163 - 23 * t, 245 - 5 * t].map(Math.round);
  let lastAutoRipple = 0;
  function drawComb(now) {
    ctx.clearRect(0, 0, W, H);
    const p = usingAuto(now) ? autopilot(now) : ptr;
    if (coarse && now - lastAutoRipple > 4200) { ripples.push({ ...autopilot(now), t: now }); lastAutoRipple = now; }
    const reach = Math.max(180, Math.min(W, 900) * 0.28);
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 2400) ripples.splice(i, 1);
    for (const h of hexes) {
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      let target = Math.max(0, 1 - d / reach); target *= target;
      for (const rp of ripples) {
        const age = (now - rp.t) / 1000, ring = age * 520, dd = Math.hypot(h.x - rp.x, h.y - rp.y);
        target += Math.exp(-((dd - ring) ** 2) / 2312) * Math.max(0, 1 - age / 2.4) * 0.9;
      }
      h.v += (Math.min(target, 1) - h.v) * 0.12;
      const [r, g, b] = colorAt(Math.min(Math.max(h.x / W, 0), 1));
      ctx.beginPath(); hexPath(h.x, h.y, R * (0.92 - h.v * 0.06));
      if (h.v > 0.02) { ctx.fillStyle = `rgba(${r},${g},${b},${(h.v * 0.16).toFixed(3)})`; ctx.fill(); }
      ctx.strokeStyle = `rgba(${r},${g},${b},${(0.08 + h.v * 0.62).toFixed(3)})`;
      ctx.lineWidth = 1 + h.v * 0.6;
      ctx.stroke();
    }
  }

  /* ---------- Logo vivo ---------- */
  const art = document.getElementById('heroArt');
  const tilt = document.getElementById('artTilt');
  const glow = document.getElementById('artGlow');
  const bee = document.getElementById('heroBee');
  let rx = 0, ry = 0;
  function drawLogo(now) {
    if (!art || !tilt) return;
    let tx, ty;
    if (usingAuto(now)) {
      const s = now / 1000; tx = Math.sin(s * 0.6) * 7; ty = Math.sin(s * 0.45 + 1) * 9;
    } else {
      const ar = art.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      const cx = ar.left - hr.left + ar.width / 2, cy = ar.top - hr.top + ar.height / 2;
      tx = Math.max(-1, Math.min(1, (ptr.y - cy) / (hr.height / 2))) * -12;
      ty = Math.max(-1, Math.min(1, (ptr.x - cx) / (hr.width / 2))) * 16;
    }
    rx += (tx - rx) * 0.08; ry += (ty - ry) * 0.08;
    tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    if (glow) glow.style.transform = `translate(${(-ry * 1.4).toFixed(1)}px, ${(rx * 1.4).toFixed(1)}px)`;
  }

  /* ---------- Título que rota ---------- */
  const words = [...document.querySelectorAll('#heroRot > span')];
  let wi = 0;
  if (words.length > 1) {
    setInterval(() => {
      if (document.hidden) return;
      const cur = words[wi]; wi = (wi + 1) % words.length; const nxt = words[wi];
      cur.classList.remove('on'); cur.classList.add('out');
      setTimeout(() => cur.classList.remove('out'), 600);
      nxt.classList.add('on');
    }, 2600);
  }

  /* ---------- Bucle: solo corre con el inicio a la vista y la pestaña activa ---------- */
  let visible = true, raf = 0;
  const loop = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  function frame(now) { raf = 0; drawComb(now); drawLogo(now); loop(); }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; loop(); }).observe(hero);
  document.addEventListener('visibilitychange', loop);
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });

  layout();
  hero.classList.add('is-live');
  if (bee) bee.classList.add('assemble');
  loop();
})();
