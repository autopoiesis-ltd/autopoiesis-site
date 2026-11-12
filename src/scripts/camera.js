// A small perspective camera: enough to draw the field in 3D and to find
// where a pointer ray meets the ground plane (y = 0). No dependencies.

const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v) => { const length = Math.hypot(...v); return v.map(c => c / length); };

export const mixVectors = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);

// Column-major 4×4 product, as WebGL expects.
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
    for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  }
  return out;
}

// The eye must not look straight down: "up" is the world y axis.
export function createCamera({ eye, target, fovY, aspect, near = .05, far = 30 }) {
  const forward = normalize(subtract(target, eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const focal = 1 / Math.tan(fovY / 2);
  const view = [
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1];
  const projection = [
    focal / aspect, 0, 0, 0,
    0, focal, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, 2 * far * near / (near - far), 0];
  const viewProjection = multiply(projection, view);

  // World point → normalised device coordinates (x, y in −1…1 on screen).
  function project([x, y, z]) {
    const m = viewProjection;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w];
  }

  // Where the ray through a screen position meets the horizontal plane at `height`
  // (the ground by default): [x, z], or null if it misses.
  function groundHit(ndcX, ndcY, height = 0) {
    const direction = normalize([0, 1, 2].map(i =>
      forward[i] + right[i] * ndcX * aspect / focal + up[i] * ndcY / focal));
    if (direction[1] > -1e-6) return null;
    const distance = (height - eye[1]) / direction[1];
    if (distance <= 0) return null;
    return [eye[0] + direction[0] * distance, eye[2] + direction[2] * distance];
  }

  return { eye, viewProjection, project, groundHit };
}
