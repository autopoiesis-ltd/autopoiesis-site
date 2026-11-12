import test from 'node:test';
import assert from 'node:assert/strict';
import { createStimulusSchedule } from '../src/scripts/stimulus-schedule.js';

const centre = () => ({ x: 10, y: 20 });
function run(schedule, count, pickSite = centre) {
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(schedule.tick(pickSite));
  return ticks;
}

test('feed and kill stay inside the bounded labyrinth excursion', () => {
  const ticks = run(createStimulusSchedule({ warmup: 0 }), 12000);
  for (const { feed, kill } of ticks) {
    assert(feed >= .0356 && feed <= .0364);
    assert(kill >= .0595 && kill <= .0625);
  }
});

test('first seed appears on schedule at the picked site and ramps in gently', () => {
  const ticks = run(createStimulusSchedule({ warmup: 0, seedEvery: 300, seedDuration: 90 }), 300);
  assert(ticks.slice(0, 299).every(tick => tick.sources.length === 0));
  const [source] = ticks[299].sources;
  assert.equal(source.x, 10);
  assert.equal(source.y, 20);
  assert(source.envelope > 0 && source.envelope < .05, 'Stimulation must not start at full strength');
});

test('a seed rises, falls and retires after its duration', () => {
  const schedule = createStimulusSchedule({ warmup: 0, seedEvery: 100, seedJitter: 0, seedDuration: 40, maxSources: 1 });
  const ticks = run(schedule, 140);
  const life = ticks.slice(99, 139).map(tick => tick.sources[0].envelope);
  assert.equal(life.length, 40);
  assert(life.every(envelope => envelope > 0 && envelope <= 1));
  assert(Math.max(...life) > .99);
  assert.equal(ticks[139].sources.length, 0);
});

test('concurrent seeds never exceed maxSources', () => {
  const ticks = run(createStimulusSchedule({ warmup: 0, seedEvery: 10, seedDuration: 500, maxSources: 3 }), 2000);
  assert.equal(Math.max(...ticks.map(tick => tick.sources.length)), 3);
});

test('seedEvery of zero disables stimulation', () => {
  const ticks = run(createStimulusSchedule({ warmup: 0, seedEvery: 0 }), 2000);
  assert(ticks.every(tick => tick.sources.length === 0));
});

test('seeded schedules are reproducible and pass their random stream to the site picker', () => {
  const pick = random => ({ x: Math.floor(random() * 200), y: Math.floor(random() * 200) });
  const a = run(createStimulusSchedule({ warmup: 0, seed: 31 }), 3000, pick);
  const b = run(createStimulusSchedule({ warmup: 0, seed: 31 }), 3000, pick);
  const c = run(createStimulusSchedule({ warmup: 0, seed: 32 }), 3000, pick);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});
