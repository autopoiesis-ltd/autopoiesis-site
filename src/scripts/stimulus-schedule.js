import { GRAY_SCOTT_DEFAULTS } from './gray-scott.js';

// Timing of the Gray–Scott stimulation, free of any field data: when the feed
// and kill rates drift, when a new seed starts, and how strongly each live seed
// pushes. The GPU simulation uses this to mirror the CPU core's behaviour.
export function createStimulusSchedule(opts = {}) {
  const o = { ...GRAY_SCOTT_DEFAULTS, ...opts };
  let randomState = o.seed >>> 0 || 1;
  const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
  let t = 0, sources = [], nextSeedAt = o.warmup + o.seedEvery;

  // pickSite(random) chooses where a new seed grows and returns { x, y } in cells.
  function tick(pickSite) {
    t++;
    const kill = o.k + o.breathe * Math.sin(2 * Math.PI * t / o.breathePeriod);
    const feed = o.F + o.feedBreathe * Math.sin(2 * Math.PI * t / (o.breathePeriod * 1.618));
    if (t > o.warmup && o.seedEvery > 0 && t >= nextSeedAt && sources.length < o.maxSources) {
      const { x, y } = pickSite(random);
      sources = [...sources, { x, y, age: 0 }];
      // Random spacing around seedEvery so growth never ticks on a visible clock.
      const spread = 1 + o.seedJitter * (2 * random() - 1);
      nextSeedAt = t + Math.max(1, Math.round(o.seedEvery * spread));
    }
    // A gradual temporal envelope: each seed fades in, peaks and retires quietly.
    const active = sources.map(({ x, y, age }) => (
      { x, y, envelope: Math.sin(Math.PI * (age + 1) / (o.seedDuration + 1)) }));
    sources = sources.map(source => ({ ...source, age: source.age + 1 }))
      .filter(source => source.age < o.seedDuration);
    return { feed, kill, sources: active };
  }

  return { tick, get steps() { return t; } };
}
