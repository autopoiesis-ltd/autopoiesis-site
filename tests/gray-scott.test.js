import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrayScott } from '../src/scripts/gray-scott.js';

function advance(sim, count) { for (let i = 0; i < count; i++) sim.step(); }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }

test('quiet-field monitor restores growth even when all activator is gone', () => {
  const sim = createGrayScott({ n: 64, seeds: 0, noise: 0, warmup: 0, seedEvery: 0 });
  advance(sim, 900);
  assert.equal(mean(sim.activator), 0);
  advance(sim, 2100);
  assert(sim.getStats().recoverySeeds > 0);
  assert.equal(sim.getStats().periodicSeeds, 0);
  assert(Math.max(...sim.activator) > .2);
  assert(sim.activator.filter(value => value > .1).length > 100, 'Seed must grow into a pattern');
});

test('scheduled stimulation starts locally and gradually, without clearing the field', () => {
  const sim = createGrayScott({ n: 64, seeds: 0, noise: 0, warmup: 0,
    monitorEvery: 0, seedEvery: 300, seedCooldown: 300 });
  advance(sim, 299);
  const before = sim.activator.slice();
  sim.step();
  assert.equal(sim.getStats().periodicSeeds, 1);
  const changed = sim.activator.filter((value, i) => value !== before[i]);
  assert(changed.length > 0 && changed.length < 150, 'Stimulation must stay local');
  assert(Math.max(...changed) < .01, 'First step must not stamp a visible solid disc');
  advance(sim, 1000);
  assert(Math.max(...sim.activator) > .2);
});

test('seeded runs are reproducible including ongoing stimulation', () => {
  const a = createGrayScott({ n: 40, warmup: 0 });
  const b = createGrayScott({ n: 40, warmup: 0 });
  advance(a, 2400); advance(b, 2400);
  assert.deepEqual(a.activator, b.activator);
  assert.deepEqual(a.getStats(), b.getStats());
});

for (const [n, seed] of [[80, 7], [80, 31], [80, 91], [200, 7]]) {
  test(`long run stays finite, patterned and changing (${n} cells, seed ${seed})`, () => {
    const sim = createGrayScott({ n, seed });
    advance(sim, 3000);
    let previous = sim.activator.slice();
    for (let window = 0; window < 10; window++) {
      advance(sim, 2400);
      const stats = sim.getStats();
      assert(stats.feed >= .0356 && stats.feed <= .0364);
      assert(stats.kill >= .0595 && stats.kill <= .0625);
      let change = 0;
      for (let i = 0; i < sim.activator.length; i++) {
        const u = sim.substrate[i], v = sim.activator[i];
        assert(Number.isFinite(u) && Number.isFinite(v));
        assert(u >= 0 && u <= 1.05 && v >= 0 && v <= 1.05);
        change += Math.abs(v - previous[i]);
      }
      assert(change / previous.length > .001, 'Pattern must evolve across each long window');
      assert(Math.max(...sim.activator) > .2, 'Activator must survive');
      assert(Math.min(...sim.activator) < .05, 'Pattern must retain empty regions');
      previous = sim.activator.slice();
    }
    assert(sim.getStats().periodicSeeds + sim.getStats().recoverySeeds >= 10);
  });
}

test('random re-seeds fire at jittered intervals and overlap so the field never settles', () => {
  const sim = createGrayScott({ n: 64, seeds: 0, noise: 0, warmup: 0, monitorEvery: 0,
    seedEvery: 300, seedJitter: .5, seedCooldown: 60, maxSources: 3, seedDuration: 200 });
  const seedSteps = [];
  let seen = 0, maxActive = 0;
  for (let i = 0; i < 6000; i++) {
    sim.step();
    const stats = sim.getStats();
    if (stats.periodicSeeds > seen) { seen = stats.periodicSeeds; seedSteps.push(i + 1); }
    maxActive = Math.max(maxActive, stats.activeSeeds);
  }
  const gaps = seedSteps.slice(1).map((step, i) => step - seedSteps[i]);
  assert(gaps.length >= 10, 'Re-seeds must keep arriving');
  assert(new Set(gaps).size > 3, 'Intervals must vary rather than tick on a fixed clock');
  assert(gaps.every(gap => gap >= 150 && gap <= 450), 'Jitter stays within ±50% of seedEvery');
  assert(maxActive > 1, 'Several seeds must be able to grow at once');
});

test('seed jitter of zero keeps the original fixed cadence', () => {
  const sim = createGrayScott({ n: 64, seeds: 0, noise: 0, warmup: 0, monitorEvery: 0,
    seedEvery: 300, seedJitter: 0, seedCooldown: 60, maxSources: 1 });
  advance(sim, 300);
  assert.equal(sim.getStats().periodicSeeds, 1);
  advance(sim, 299);
  assert.equal(sim.getStats().periodicSeeds, 1);
  sim.step();
  assert.equal(sim.getStats().periodicSeeds, 2);
});
