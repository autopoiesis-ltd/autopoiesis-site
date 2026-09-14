// Numerical core kept independent of the canvas so long runs can be checked.
export function createGrayScott(opts = {}) {
  const o = { n: 160, F: .036, k: .061, Du: .16, Dv: .08,
    seeds: 9, seed: 7, noise: .02, warmup: 3000,
    breathe: .0015, breathePeriod: 5000, feedBreathe: .0004,
    seedEvery: 300, seedJitter: .5, maxSources: 4, seedRadius: 5, seedDuration: 90,
    monitorEvery: 120, activityThreshold: .0005, quietChecks: 4,
    seedCooldown: 600, ...opts };
  const n = o.n, N = n * n;
  let U = new Float32Array(N).fill(1), V = new Float32Array(N);
  let nextU = new Float32Array(N), nextV = new Float32Array(N);
  const previous = new Float32Array(N);
  let randomState = o.seed >>> 0 || 1;
  const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
  const index = (x, y) => ((y % n + n) % n) * n + (x % n + n) % n;
  for (let q = 0; q < o.seeds; q++) {
    const x = Math.floor(random() * n), y = Math.floor(random() * n);
    for (let dy = -3; dy < 3; dy++) for (let dx = -3; dx < 3; dx++) V[index(x + dx, y + dy)] = 1;
  }
  for (let i = 0; i < N; i++) { U[i] += o.noise * random(); V[i] += o.noise * random(); }
  previous.set(V);
  let t = 0, activity = Infinity, quiet = 0, lastSeed = o.warmup;
  let sources = [], nextSeedAt = o.warmup + o.seedEvery, periodicSeeds = 0, recoverySeeds = 0;
  let feed = o.F, kill = o.k;

  function scheduleNextSeed() {
    // Random spacing around seedEvery so growth never ticks on a visible clock.
    const spread = 1 + o.seedJitter * (2 * random() - 1);
    nextSeedAt = t + Math.max(1, Math.round(o.seedEvery * spread));
  }

  function seed(reason) {
    // Prefer sparse areas; leave the established pattern intact elsewhere.
    let x = 0, y = 0, lowest = Infinity;
    for (let candidate = 0; candidate < 16; candidate++) {
      const cx = Math.floor(random() * n), cy = Math.floor(random() * n);
      let density = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) density += V[index(cx + dx, cy + dy)];
      if (density < lowest) { lowest = density; x = cx; y = cy; }
    }
    sources = [...sources, { x, y, age: 0 }];
    lastSeed = t; quiet = 0;
    scheduleNextSeed();
    if (reason === 'recovery') recoverySeeds++; else periodicSeeds++;
  }

  function stimulateOne(source) {
    // A soft spatial profile and a gradual temporal envelope avoid a hard disc
    // appearing in one frame. This supplies activator, rather than just erasing it.
    const envelope = Math.sin(Math.PI * (source.age + 1) / (o.seedDuration + 1));
    const radius = Math.min(o.seedRadius, Math.floor((n - 1) / 2));
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy) / radius;
      if (distance >= 1) continue;
      const weight = .12 * envelope * (1 - distance * distance) ** 2;
      const i = index(source.x + dx, source.y + dy);
      U[i] += (.5 - U[i]) * weight;
      V[i] += (.55 - V[i]) * weight;
    }
  }

  function stimulate() {
    // Several seeds may grow at once; each ages independently and retires quietly.
    sources.forEach(stimulateOne);
    sources = sources.map(source => ({ ...source, age: source.age + 1 }))
      .filter(source => source.age < o.seedDuration);
  }

  function step() {
    t++;
    // Small bounded excursions around the labyrinth regime, not a sweep across
    // unrelated presets. Separate periods avoid an obvious visual breathing loop.
    kill = o.k + o.breathe * Math.sin(2 * Math.PI * t / o.breathePeriod);
    feed = o.F + o.feedBreathe * Math.sin(2 * Math.PI * t / (o.breathePeriod * 1.618));
    if (t > o.warmup && o.seedEvery > 0 && t >= nextSeedAt && sources.length < o.maxSources) seed('periodic');
    stimulate();
    for (let y = 0; y < n; y++) {
      const ym = ((y + n - 1) % n) * n, yp = ((y + 1) % n) * n, row = y * n;
      for (let x = 0; x < n; x++) {
        const xm = (x + n - 1) % n, xp = (x + 1) % n, i = row + x;
        const u = U[i], v = V[i], reaction = u * v * v;
        const lu = U[ym + x] + U[yp + x] + U[row + xm] + U[row + xp] - 4 * u;
        const lv = V[ym + x] + V[yp + x] + V[row + xm] + V[row + xp] - 4 * v;
        nextU[i] = u + o.Du * lu - reaction + feed * (1 - u);
        nextV[i] = v + o.Dv * lv + reaction - (feed + kill) * v;
      }
    }
    [U, nextU] = [nextU, U]; [V, nextV] = [nextV, V];
    if (o.monitorEvery > 0 && t % o.monitorEvery === 0) {
      let change = 0;
      for (let i = 0; i < N; i++) change += Math.abs(V[i] - previous[i]);
      activity = change / N;
      previous.set(V);
      if (t > o.warmup && sources.length === 0 && t - lastSeed >= o.seedCooldown) {
        quiet = activity < o.activityThreshold ? quiet + 1 : 0;
        if (quiet >= o.quietChecks) seed('recovery');
      } else quiet = 0;
    }
  }

  return {
    step,
    get activator() { return V; },
    get substrate() { return U; },
    getStats() { return { steps: t, activity, periodicSeeds, recoverySeeds,
      stimulating: sources.length > 0, activeSeeds: sources.length, feed, kill }; },
  };
}
