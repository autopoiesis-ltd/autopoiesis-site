import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, mixVectors } from '../src/scripts/camera.js';

const close = (actual, expected, tolerance = 1e-6) =>
  assert(Math.abs(actual - expected) < tolerance, `${actual} is not within ${tolerance} of ${expected}`);
const oblique = { eye: [0, .6, 1.3], target: [0, 0, .1], fovY: .7, aspect: 1.8 };

test('the look-at target projects to the centre of the screen', () => {
  const [x, y] = createCamera(oblique).project([0, 0, .1]);
  close(x, 0); close(y, 0);
});

test('points to the right of and above the target land right of and above centre', () => {
  const camera = createCamera(oblique);
  assert(camera.project([.3, 0, .1])[0] > 0);
  assert(camera.project([0, .2, .1])[1] > 0);
});

test('a ray through the screen centre hits the ground at the target', () => {
  const [x, z] = createCamera(oblique).groundHit(0, 0);
  close(x, 0); close(z, .1);
});

test('projecting a ground point and casting back through it returns the same point', () => {
  const camera = createCamera(oblique);
  for (const [x, z] of [[.4, -.3], [-.7, .5], [.1, .9]]) {
    const [ndcX, ndcY] = camera.project([x, 0, z]);
    const hit = camera.groundHit(ndcX, ndcY);
    close(hit[0], x, 1e-5); close(hit[1], z, 1e-5);
  }
});

test('a ray can be cast onto a plane raised above the ground', () => {
  const camera = createCamera(oblique);
  const [ndcX, ndcY] = camera.project([.4, .1, -.3]);
  const hit = camera.groundHit(ndcX, ndcY, .1);
  close(hit[0], .4, 1e-5); close(hit[1], -.3, 1e-5);
});

test('a ray that points at the sky never hits the ground', () => {
  // A shallow camera: the top of its screen looks above the horizon.
  const shallow = createCamera({ ...oblique, eye: [0, .2, 1.3], target: [0, 0, 0] });
  assert.equal(shallow.groundHit(0, .99), null);
  assert.notEqual(shallow.groundHit(0, -.5), null);
});

test('the view-projection matrix is 16 finite numbers', () => {
  const { viewProjection } = createCamera(oblique);
  assert.equal(viewProjection.length, 16);
  assert(viewProjection.every(Number.isFinite));
});

test('mixVectors interpolates without touching its inputs', () => {
  const a = [0, 2, 4], b = [10, 2, 0];
  assert.deepEqual(mixVectors(a, b, .5), [5, 2, 2]);
  assert.deepEqual(a, [0, 2, 4]);
});
