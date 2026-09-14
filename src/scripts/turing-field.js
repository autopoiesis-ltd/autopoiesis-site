import { createGrayScott } from './gray-scott.js';

// Canvas presentation; all chemistry and sustained stimulation live in the core.
export function turingField(canvas, opts) {
  const o = { n: 160, steps: 8, warmup: 0, seeds: 0, noise: 0,
    seedEvery: 180, seedDuration: 180, breathePeriod: 3600,
    ink: [0x14, 0x12, 0x10], bone: [0xF4, 0xF0, 0xE8], plasma: [0x7B, 0x3F, 0xE4], ...opts };
  const n = o.n;
  const simulation = createGrayScott(o);
  const step = simulation.step;
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'); off.width = n; off.height = n;
  const octx = off.getContext('2d');
  if (!ctx || !octx) throw new Error('Canvas rendering is unavailable');
  const img = octx.createImageData(n, n);
  let raf = 0, running = o.steps > 0;

  function paint() {
    const V = simulation.activator;
    const d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const v = Math.min(1, V[i] * 2.4);                       // activator level → bone
      const ym = ((y + n - 1) % n) * n, yp = ((y + 1) % n) * n, xm = (x + n - 1) % n, xp = (x + 1) % n;
      const lap = Math.abs(V[ym + x] + V[yp + x] + V[y * n + xm] + V[y * n + xp] - 4 * V[i]);
      const e = Math.min(1, lap * 7) * 0.6;                    // rim of change → plasma
      for (let c = 0; c < 3; c++) {
        const base = o.ink[c] * (1 - v) + o.bone[c] * v;
        d[i * 4 + c] = base * (1 - e) + o.plasma[c] * e;
      }
      d[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const sc = Math.max(canvas.width / n, canvas.height / n), dw = n * sc, dh = n * sc;   // cover, keep cells square
    ctx.drawImage(off, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }

  function frame() {
    if (!running) return;
    for (let i = 0; i < o.steps; i++) step();
    paint();
    raf = requestAnimationFrame(frame);
  }
  // Start empty by default; gradual local stimulation grows the visible pattern.
  for (let i = 0; i < o.warmup; i++) step();
  paint();
  if (running) raf = requestAnimationFrame(frame);
  return {
    stop() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running && o.steps > 0) { running = true; raf = requestAnimationFrame(frame); } },
    step, paint, getStats: simulation.getStats
  };
}
