// =====================================================
// Closed Helix generator — renders into [data-helix] nodes
// =====================================================
function closedHelix({ size = 24 } = {}) {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.34, d = size * 0.068, N = 8;
  const sw = size * 0.020;
  const steps = 200;
  const pA = [], pB = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const s = Math.sin(N * t) * d;
    pA.push([cx + (R + s) * Math.cos(t), cy + (R + s) * Math.sin(t)]);
    pB.push([cx + (R - s) * Math.cos(t), cy + (R - s) * Math.sin(t)]);
  }
  const toPath = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L') + ' Z';
  const maskR = sw * 2.1;
  let circles = '';
  for (let k = 0; k < 2 * N; k++) {
    if (k % 2 === 0) {
      const t = k * Math.PI / N;
      const x = cx + R * Math.cos(t), y = cy + R * Math.sin(t);
      circles += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${maskR.toFixed(2)}" fill="black"/>`;
    }
  }
  const id = 'h' + Math.random().toString(36).slice(2, 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none" style="display:block;width:100%;height:100%">
    <defs><mask id="${id}"><rect width="${size}" height="${size}" fill="white"/>${circles}</mask></defs>
    <path d="${toPath(pA)}" fill="none" stroke="currentColor" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>
    <path d="${toPath(pB)}" fill="none" stroke="currentColor" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" mask="url(#${id})"/>
  </svg>`;
}

function renderMarks() {
  document.querySelectorAll('[data-helix]').forEach((el) => {
    const size = Number(el.getAttribute('data-helix')) || 24;
    el.innerHTML = closedHelix({ size });
  });
}

// =====================================================
// Cell-field background — a drifting 3D population of cellular
// components (DNA, plasmids, viruses, phages, vesicles, ribosomes,
// mitochondria, proteins, antibodies, mRNA). Each is a 3D wireframe
// that tumbles, wanders on a curved path, is depth-shaded, and flickers.
// =====================================================
const TAU = Math.PI * 2;

// ---- 3D rotation of a point about x, then y, then z ----
function _rot3(p, ax, ay, az) {
  const x = p[0], y = p[1], z = p[2] || 0;
  const cax = Math.cos(ax), sax = Math.sin(ax);
  const y1 = y * cax - z * sax, z1 = y * sax + z * cax;
  const cay = Math.cos(ay), say = Math.sin(ay);
  const x2 = x * cay + z1 * say, z2 = -x * say + z1 * cay;
  const caz = Math.cos(az), saz = Math.sin(az);
  return [x2 * caz - y1 * saz, x2 * saz + y1 * caz, z2];
}

// ---- 3D primitive builders (object space, radius ~1) ----
function _ringXZ(r, n, y) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; p.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  return p;
}
// Ellipsoid wireframe: longitude + latitude rings.
function _ellipsoid(rx, ry, rz, cx = 0, cy = 0, cz = 0, lon = 3, lat = 2, seg = 22) {
  const strokes = [];
  for (let j = 0; j < lon; j++) {
    const phi = (j / lon) * Math.PI, cphi = Math.cos(phi), sphi = Math.sin(phi);
    const ring = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      ring.push([cx + rx * ca * cphi, cy + ry * sa, cz + rz * ca * sphi]);
    }
    strokes.push(ring);
  }
  for (let k = 1; k <= lat; k++) {
    const th = (k / (lat + 1)) * Math.PI - Math.PI / 2, cth = Math.cos(th), sth = Math.sin(th);
    const ring = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      ring.push([cx + rx * cth * Math.cos(a), cy + ry * sth, cz + rz * cth * Math.sin(a)]);
    }
    strokes.push(ring);
  }
  return strokes;
}
function _sphere(r, lon = 3, lat = 2, seg = 22) { return _ellipsoid(r, r, r, 0, 0, 0, lon, lat, seg); }

// Straight DNA double helix along x — spins on its own axis via ph.
function _shapeDNA(ph) {
  const half = 3.4, turns = 4.5, R = 0.5, steps = 130;
  const a = [], b = [], strokes = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps, ax = (f * 2 - 1) * half, ang = f * turns * TAU + ph;
    a.push([ax, Math.cos(ang) * R, Math.sin(ang) * R]);
    b.push([ax, Math.cos(ang + Math.PI) * R, Math.sin(ang + Math.PI) * R]);
  }
  strokes.push(a, b);
  for (let i = 0; i <= steps; i += 6) strokes.push([a[i], b[i]]); // base pairs
  return strokes;
}

// Plasmid — closed (circular) double helix; spins via ph.
function _shapePlasmid(ph) {
  const N = 8, steps = 90, d = 0.2, out = [[], []];
  for (let s = 0; s < 2; s++) {
    const po = s === 0 ? 0 : Math.PI;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * TAU, v = N * u + ph + po, cv = Math.cos(v), sv = Math.sin(v);
      out[s].push([(1 + d * cv) * Math.cos(u), (1 + d * cv) * Math.sin(u), d * sv]);
    }
  }
  return out;
}

// mRNA — single 3D coil; spins via ph.
function _shapeRNA(ph) {
  const half = 1.7, n = 80, turns = 3.5, R = 0.28, p = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, ang = f * turns * TAU + ph;
    p.push([(f * 2 - 1) * half, Math.cos(ang) * R, Math.sin(ang) * R * 0.6]);
  }
  return [p];
}

// Virus — spherical capsid with club-tipped spikes radiating in 3D (corona).
function _shapeVirus() {
  const r = 0.55, strokes = _sphere(r, 3, 2, 20), n = 22;
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963;
    const dx = Math.cos(th) * rad, dy = y, dz = Math.sin(th) * rad;
    const b = [dx * r, dy * r, dz * r];
    const t = [dx * (r + 0.22), dy * (r + 0.22), dz * (r + 0.22)];
    strokes.push([b, t]);                                            // stalk
    strokes.push([t, [t[0] + dx * 0.06, t[1] + dy * 0.06, t[2] + dz * 0.06]]); // club
  }
  return strokes;
}

// Bacteriophage — icosahedral head, tail sheath, baseplate, leg fibres.
function _shapePhage() {
  const strokes = [], hy = 0.6, hr = 0.4;
  for (const st of _ellipsoid(hr, hr, hr, 0, hy, 0, 3, 1, 14)) strokes.push(st); // head
  const ty0 = hy - hr, ty1 = -0.2, tr = 0.12;
  strokes.push(_ringXZ(tr, 12, ty0), _ringXZ(tr, 12, ty1));        // tail rings
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU, x = Math.cos(a) * tr, z = Math.sin(a) * tr;
    strokes.push([[x, ty0, z], [x, ty1, z]]);                       // sheath lines
  }
  strokes.push(_ringXZ(0.2, 6, ty1 - 0.02));                        // baseplate
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2;
    strokes.push([[x, ty1, z], [x * 1.8, ty1 - 0.16, z * 1.8], [x * 2.0, ty1 - 0.5, z * 2.0]]); // legs
  }
  return strokes;
}

// Vesicle / membrane — lipid bilayer as two concentric spheres.
function _shapeVesicle() {
  return _sphere(1, 3, 2, 24).concat(_sphere(0.8, 2, 1, 18));
}

// Ribosome — large + small subunit ellipsoids.
function _shapeRibosome() {
  return _ellipsoid(0.85, 0.7, 0.8, 0, 0.18, 0, 3, 2, 18)
    .concat(_ellipsoid(0.6, 0.45, 0.55, 0, -0.5, 0, 3, 1, 16));
}

// Mitochondrion — elongated 3D body with internal cristae rings.
function _shapeMito() {
  const rx = 1.25, ry = 0.6, rz = 0.6;
  const strokes = _ellipsoid(rx, ry, rz, 0, 0, 0, 3, 2, 28);
  const folds = 4;
  for (let i = 0; i < folds; i++) {
    const x = -0.7 + (1.4 * i) / (folds - 1), ring = [];
    for (let k = 0; k <= 18; k++) {
      const a = (k / 18) * TAU;
      ring.push([x, Math.cos(a) * ry * 0.7, Math.sin(a) * rz * 0.7]);
    }
    strokes.push(ring);
  }
  return strokes;
}

// Protein — a folded 3D backbone (seeded pseudo-random walk).
function _shapeProtein(_ph, seed) {
  let r = (seed % 233280) || 1;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const p = [];
  let x = -0.3, y = -0.2, z = 0, ax = rnd() * TAU, ay = rnd() * TAU;
  p.push([x, y, z]);
  for (let i = 0; i < 30; i++) {
    ax += (rnd() - 0.5) * 1.7; ay += (rnd() - 0.5) * 1.7;
    x += Math.cos(ax) * Math.cos(ay) * 0.16;
    y += Math.sin(ax) * 0.16;
    z += Math.cos(ax) * Math.sin(ay) * 0.16;
    p.push([x, y, z]);
  }
  return [p];
}

// Antibody — Y-shaped immunoglobulin (the "defender").
function _shapeAntibody() {
  return [
    [[0, 0.6, 0], [0, 0, 0]],
    [[0, 0, 0], [-0.5, -0.5, 0.12]],
    [[0, 0, 0], [0.5, -0.5, -0.12]],
    [[-0.5, -0.5, 0.12], [-0.66, -0.4, 0.12]],
    [[-0.5, -0.5, 0.12], [-0.56, -0.7, 0.12]],
    [[0.5, -0.5, -0.12], [0.66, -0.4, -0.12]],
    [[0.5, -0.5, -0.12], [0.56, -0.7, -0.12]],
  ];
}

const CELL_TYPES = {
  dna:      { make: _shapeDNA,      scale: 0.16,  alpha: 1.00, twist: 0.012, tumble: false, margin: 0.62 },
  plasmid:  { make: _shapePlasmid,  scale: 0.07,  alpha: 0.82, twist: 0.02,  tumble: true,  margin: 0.18 },
  rna:      { make: _shapeRNA,      scale: 0.11,  alpha: 0.62, twist: 0.03,  tumble: true,  margin: 0.30 },
  virus:    { make: _shapeVirus,    scale: 0.06,  alpha: 0.78, twist: 0,     tumble: true,  margin: 0.16 },
  phage:    { make: _shapePhage,    scale: 0.075, alpha: 0.78, twist: 0,     tumble: true,  margin: 0.20 },
  vesicle:  { make: _shapeVesicle,  scale: 0.085, alpha: 0.50, twist: 0,     tumble: true,  margin: 0.18 },
  ribosome: { make: _shapeRibosome, scale: 0.055, alpha: 0.66, twist: 0,     tumble: true,  margin: 0.14 },
  mito:     { make: _shapeMito,     scale: 0.075, alpha: 0.60, twist: 0,     tumble: true,  margin: 0.18 },
  protein:  { make: _shapeProtein,  scale: 0.07,  alpha: 0.64, twist: 0,     tumble: true,  margin: 0.16 },
  antibody: { make: _shapeAntibody, scale: 0.06,  alpha: 0.66, twist: 0,     tumble: true,  margin: 0.16 },
};

// Curated spawn order — guarantees a DNA strand plus variety.
const CELL_ORDER = ['dna', 'plasmid', 'virus', 'phage', 'ribosome', 'vesicle', 'rna', 'mito', 'antibody', 'protein', 'dna'];

function createCellField(canvas) {
  const ctx = canvas.getContext('2d');
  const color = '#F7F3E9';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const count = Math.max(5, Math.min(9, Math.round(window.innerWidth / 230)));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pm = () => (Math.random() < 0.5 ? 1 : -1);
  const instances = [];
  for (let i = 0; i < count; i++) {
    const key = CELL_ORDER[i % CELL_ORDER.length];
    const t = CELL_TYPES[key];
    instances.push({
      key, type: t,
      nx: rand(-0.1, 1.1), ny: rand(0.06, 0.94),
      heading: rand(0, TAU),
      speed: rand(0.000016, 0.00004) * (key === 'dna' ? 0.65 : 1),
      steer: key === 'dna' ? 0.0010 : 0.0007,           // path curvature
      ax: key === 'dna' ? 0 : rand(0, TAU),
      ay: key === 'dna' ? 0 : rand(0, TAU),
      az: key === 'dna' ? 0 : rand(0, TAU),
      avx: t.tumble ? pm() * rand(0.00004, 0.00013) : 0,
      avy: t.tumble ? pm() * rand(0.00004, 0.00013) : 0,
      avz: t.tumble ? pm() * rand(0.00003, 0.00010) : 0,
      ph: rand(0, TAU), seed: Math.floor(rand(1, 99999)), margin: t.margin,
    });
  }

  let last = 0;

  function drawInstance(inst, W, H, minWH, now) {
    const t = inst.type, S = t.scale * minWH;
    const cx = inst.nx * W, cy = inst.ny * H;
    const strokes = t.make(inst.ph, inst.seed);

    const segs = [];
    let idx = 0, maxZ = 1e-4;
    for (const stroke of strokes) {
      let prev = null;
      for (let i = 0; i < stroke.length; i++) {
        const r = _rot3(stroke[i], inst.ax, inst.ay, inst.az);
        if (Math.abs(r[2]) > maxZ) maxZ = Math.abs(r[2]);
        if (prev) {
          segs.push({
            x1: cx + prev[0] * S, y1: cy + prev[1] * S,
            x2: cx + r[0] * S, y2: cy + r[1] * S,
            z: (prev[2] + r[2]) * 0.5,
            fp: (idx++) * 0.7 + inst.seed,
          });
        }
        prev = r;
      }
    }
    segs.sort((a, b) => a.z - b.z); // painter's order: back to front

    ctx.lineWidth = Math.max(1, S * 0.045);
    for (const s of segs) {
      let a = t.alpha * (0.35 + 0.65 * ((s.z / maxZ) + 1) / 2); // depth shading
      if (!reducedMotion) {
        a *= 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.02 + s.fp)); // shimmer
        if (Math.random() < 0.045) a *= 0.18;                       // dropout flicker
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }

  function frame(now) {
    const W = canvas.width, H = canvas.height, minWH = Math.min(W, H);
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const inst of instances) {
      if (!reducedMotion) {
        inst.heading += (Math.random() - 0.5) * inst.steer * dt; // wander
        inst.nx += Math.cos(inst.heading) * inst.speed * dt;
        inst.ny += Math.sin(inst.heading) * inst.speed * dt * 0.65;
        inst.ax += inst.avx * dt;
        inst.ay += inst.avy * dt;
        inst.az += inst.avz * dt;
        inst.ph += inst.type.twist;
        const m = inst.margin;
        if (inst.nx < -m) { inst.nx = 1 + m; inst.ny = Math.random(); }
        else if (inst.nx > 1 + m) { inst.nx = -m; inst.ny = Math.random(); }
        if (inst.ny < -m) { inst.ny = 1 + m; }
        else if (inst.ny > 1 + m) { inst.ny = -m; }
      }
      drawInstance(inst, W, H, minWH, now);
    }
    ctx.globalAlpha = 1;
    if (!reducedMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function renderHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (canvas) createCellField(canvas);
}
// =====================================================
// Binary scramble — any element marked [data-scramble]
// =====================================================
function setupScramble() {
  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const POOL = '01';
  const randChar = () => POOL[Math.floor(Math.random() * POOL.length)];
  const SCRAMBLEABLE = /[\p{L}\p{N}]/u;

  const REGISTRY = [];

  function prepare(el) {
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const chars = [];
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text) return;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          const span = document.createElement('span');
          span.setAttribute('aria-hidden', 'true');
          span.textContent = ch;
          frag.appendChild(span);
          if (SCRAMBLEABLE.test(ch)) {
            const entry = { span, char: ch };
            chars.push(entry);
            REGISTRY.push(entry);
          }
        }
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        Array.from(node.childNodes).forEach(walk);
      }
    }
    walk(el);
    return chars;
  }

  function run(chars, duration) {
    if (chars.length === 0) return;
    const lockTimes = chars.map((_, i) => {
      const base = (i / Math.max(1, chars.length - 1)) * duration * 0.6;
      const jitter = Math.random() * duration * 0.4;
      return base + jitter;
    });
    for (const { span } of chars) {
      span.textContent = randChar();
      span.style.opacity = '0.3';
    }
    let start = 0, lastRefresh = 0;
    function frame(now) {
      if (!start) start = now;
      const elapsed = now - start;
      const refresh = (now - lastRefresh) > 45;
      if (refresh) lastRefresh = now;
      let locked = 0;
      for (let i = 0; i < chars.length; i++) {
        const { span, char } = chars[i];
        if (elapsed >= lockTimes[i]) {
          if (span.textContent !== char) {
            span.textContent = char;
            span.style.opacity = '1';
          }
          locked++;
        } else {
          if (refresh) span.textContent = randChar();
          const p = elapsed / lockTimes[i];
          span.style.opacity = (0.3 + p * 0.6).toFixed(2);
        }
      }
      if (locked < chars.length) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function durationFor(len) {
    if (len < 15) return 450;
    if (len < 40) return 600;
    if (len < 100) return 800;
    if (len < 250) return 1000;
    return 1200;
  }

  const ready = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();

  ready.then(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !entry.target.dataset.scrambled) {
          entry.target.dataset.scrambled = '1';
          const chars = prepare(entry.target);
          run(chars, durationFor(chars.length));
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.25 });

    document.querySelectorAll('[data-scramble]').forEach((el) => {
      // Elements above the fold (or explicitly flagged) scramble immediately;
      // the rest scramble as they enter the viewport.
      if (el.hasAttribute('data-scramble-now')) {
        el.dataset.scrambled = '1';
        const chars = prepare(el);
        run(chars, durationFor(chars.length));
      } else {
        observer.observe(el);
      }
    });
  });

  // Ambient one-character glitch
  function startAmbientGlitch() {
    function visibleChars() {
      const out = [];
      for (const entry of REGISTRY) {
        const r = entry.span.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight &&
            r.right > 0 && r.left < window.innerWidth) {
          out.push(entry);
        }
      }
      return out;
    }
    function glitchOne() {
      const pool = visibleChars();
      if (pool.length === 0) { scheduleNext(); return; }
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const { span, char } = entry;
      const duration = 220 + Math.random() * 320;
      const start = performance.now();
      let lastFlip = 0;
      function frame(now) {
        const elapsed = now - start;
        if (elapsed >= duration) { span.textContent = char; return; }
        if (now - lastFlip > 45) { span.textContent = randChar(); lastFlip = now; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      scheduleNext();
    }
    function scheduleNext() {
      setTimeout(glitchOne, 15000 + Math.random() * 15000);
    }
    setTimeout(glitchOne, 8000);
  }
  startAmbientGlitch();
}

// =====================================================
// Services dropdown (nav)
// =====================================================
function setupDropdown() {
  document.querySelectorAll('[data-dropdown]').forEach((dd) => {
    const trigger = dd.querySelector('.dd-trigger');
    if (!trigger) return;
    const open = () => dd.setAttribute('data-open', 'true');
    const close = () => dd.setAttribute('data-open', 'false');
    const toggle = () => (dd.getAttribute('data-open') === 'true' ? close() : open());

    // Hover intent on desktop (pointer: fine)
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (fine) {
      let t;
      dd.addEventListener('mouseenter', () => { clearTimeout(t); open(); });
      dd.addEventListener('mouseleave', () => { t = setTimeout(close, 160); });
    }
    // Click/tap always toggles (covers touch + keyboard)
    trigger.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.addEventListener('click', (e) => {
      if (!dd.contains(e.target)) close();
    });
  });
}

// =====================================================
// Boot
// =====================================================
function boot() {
  renderMarks();
  renderHeroCanvas();
  setupDropdown();
  setupScramble();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
