import { createCamera, mixVectors } from './camera.js';
import { FIELD_VARIANTS } from './field-variants.js';
import { link } from './gl-utils.js';
import { createGrayScottGL } from './gray-scott-gl.js';

// The living field drawn in 3D: every point samples the Gray–Scott activator,
// which lifts it off its surface and lights it. The surface is a dish, a sphere
// or the inside of a tube; field-variants.js says which, per page.

const SHAPES = Object.freeze({ plane: 0, sphere: 1, tube: 2 });

const POINTS_VERTEX = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D state;
uniform int n, shape;          // shape: 0 = plane, 1 = sphere, 2 = inside of a tube
uniform ivec2 grid;
uniform vec2 tile, radii, drift, fog;
uniform mat4 viewProjection;
uniform mat3 model;
uniform vec3 eye, centre;
uniform float extent, relief, pointScale, time;
out float level, edge, fade;
const float TAU = 6.28318530718;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float activator(ivec2 c) { return texelFetch(state, ((c % n) + n) % n, 0).g; }
float smoothActivator(vec2 at) {
  ivec2 c = ivec2(floor(at));
  vec2 f = fract(at);
  return mix(mix(activator(c), activator(c + ivec2(1, 0)), f.x),
    mix(activator(c + ivec2(0, 1)), activator(c + ivec2(1, 1)), f.x), f.y);
}
// Three flat projections of the field, blended by which way the surface faces:
// a wrap-around pattern laid over a sphere with no seam and no pinched poles.
float sphereActivator(vec3 p) {
  vec3 weight = pow(abs(p), vec3(4.));
  weight /= weight.x + weight.y + weight.z;
  float across = tile.x * float(n);
  // Opposite faces read different parts of the field, so they are not mirror images.
  vec3 far = step(0., p) * .5 * float(n);
  return weight.x * smoothActivator((p.yz * .5 + .5) * across + far.x)
    + weight.y * smoothActivator((p.zx * .5 + .5) * across + far.y)
    + weight.z * smoothActivator((p.xy * .5 + .5) * across + far.z);
}
void main() {
  // No vertex buffers: each point finds its own place from its index.
  vec2 cell = vec2(gl_VertexID % grid.x, gl_VertexID / grid.x);
  vec3 world;
  float visibility;
  if (shape == 1) {
    // An even spiral of points over the sphere (a Fibonacci lattice).
    float count = float(grid.x * grid.y), index = float(gl_VertexID);
    float height = 1. - 2. * (index + .5) / count;
    float angle = index * 2.39996323;
    vec3 local = vec3(sqrt(1. - height * height) * vec2(cos(angle), sin(angle)), height).xzy;
    level = smoothstep(.03, .33, sphereActivator(local));
    edge = level * (1. - level) * 3.;   // the flanks of the pattern glow
    vec3 normal = model * local;
    world = centre + normal * (radii.x + relief * level);
    // Nothing hides the far side, so let it recede instead.
    visibility = mix(.08, 1., smoothstep(-.25, .55, dot(normal, normalize(eye - world))));
  } else {
    // Jitter inside the grid cell so the grid reads as grain rather than rows.
    vec2 uv = (cell + vec2(hash(cell + .13), hash(cell + 7.7))) / vec2(grid);
    vec2 at = uv * tile * float(n) + drift - .5;
    float v = smoothActivator(at);
    vec2 slope = vec2(smoothActivator(at + vec2(1., 0.)) - smoothActivator(at - vec2(1., 0.)),
      smoothActivator(at + vec2(0., 1.)) - smoothActivator(at - vec2(0., 1.)));
    level = smoothstep(.03, .33, v);
    edge = min(1., length(slope) * 3.5) * .75;
    if (shape == 2) {
      // radii = (tube radius, tube length); growth stands in from the wall.
      float around = uv.x * TAU;
      vec3 wall = model * vec3(cos(around), sin(around), 0.);
      world = centre + wall * (radii.x - relief * level) + vec3(0., 0., (.5 - uv.y) * radii.y);
      visibility = smoothstep(fog.y, fog.x, distance(world, eye));
    } else {
      world = vec3((uv.x - .5) * 2. * extent, relief * level, (uv.y - .5) * 2. * extent);
      // Fade towards the rim of the dish and with distance.
      visibility = smoothstep(1., .72, length(uv - .5) * 2.) * smoothstep(fog.y, fog.x, distance(world, eye));
    }
  }
  gl_Position = viewProjection * vec4(world, 1.);
  // Points about to pass the camera fade out rather than swelling across the screen.
  if (shape == 2) visibility *= smoothstep(.2, .7, gl_Position.w);
  gl_PointSize = min(pointScale * (.55 + level) / gl_Position.w, pointScale * 5.);
  fade = visibility * (.65 + .7 * hash(cell + floor(time * 12.) * 17.));   // flicker like grain
}`;

const POINTS_FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 bone, plasma;
uniform float intensity, dust;
in float level, edge, fade;
out vec4 outColor;
void main() {
  float disc = smoothstep(.5, .1, length(gl_PointCoord - .5));
  vec3 colour = mix(bone * dust, bone, level);     // bare substrate is faint dust
  colour = mix(colour, plasma * 1.5, edge);        // growing fronts glow
  outColor = vec4(colour * disc * fade * intensity, 1.);
}`;

const ease = t => t * t * (3 - 2 * t);
const clamp01 = value => Math.min(1, Math.max(0, value));

// Column-major rotations.
function tiltedTurn(tilt, turn) {   // turn about the vertical axis, then tilt about the horizontal one
  const ct = Math.cos(tilt), st = Math.sin(tilt), ca = Math.cos(turn), sa = Math.sin(turn);
  return [ca, st * sa, -ct * sa, 0, ct, st, sa, -st * ca, ct * ca];
}
function roll(angle) {              // about the line of sight
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

// Throws when WebGL2 or float render targets are missing, so the caller can
// fall back to the Canvas 2D presentation.
export function createFieldTerrain(canvas, opts = {}) {
  const preset = { ...FIELD_VARIANTS[opts.variant ?? 'culture'], ...opts };
  // `detail` thins the points for small or slow screens without changing the field itself.
  const detail = opts.detail ?? 1;
  const o = { ...preset, columns: Math.round(preset.columns * detail), rows: Math.round(preset.rows * detail) };
  const plane = o.shape === 'plane', sphere = o.shape === 'sphere';
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error('WebGL2 is unavailable');
  const rgb = colour => colour.map(channel => channel / 255);
  let simulation, points, pointArray;
  let raf = 0, running = false, lost = false;
  let view = { lift: 0, turn: 0, intensity: 1, agitation: 0 };
  let camera = null, woundLeft = 0, wounds = 0, lastPointerAt = -Infinity, clock = 0;
  let nextStrikeAt = 0;
  let lean = [0, 0], leanTarget = [0, 0];   // how far the pointer has tipped a closed body

  function build() {
    simulation = createGrayScottGL(gl, o);
    points = link(gl, POINTS_VERTEX, POINTS_FRAGMENT, ['state', 'n', 'shape', 'grid', 'tile', 'radii',
      'drift', 'fog', 'viewProjection', 'model', 'eye', 'centre', 'extent', 'relief', 'pointScale',
      'time', 'bone', 'plasma', 'intensity', 'dust']);
    pointArray = gl.createVertexArray();
  }

  const aspect = () => canvas.width / Math.max(1, canvas.height);

  function currentCamera() {
    if (!plane) return createCamera({ ...o.view, fovY: o.fovY, aspect: aspect() });
    const lift = ease(clamp01(view.lift));
    const eye = mixVectors(o.lowView.eye, o.highView.eye, lift);
    const target = mixVectors(o.lowView.target, o.highView.target, lift);
    // Orbit the eye around the centre of the dish.
    const angle = o.heading + view.turn;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const orbit = ([x, y, z]) => [x * cos + z * sin, y, z * cos - x * sin];
    return createCamera({ eye: orbit(eye), target: orbit(target), fovY: o.fovY, aspect: aspect() });
  }

  function modelMatrix() {
    if (sphere) {
      return tiltedTurn(o.tilt + lean[1] * .35 + view.lift * .6, clock * o.spin + view.turn + lean[0] * .6);
    }
    return roll(plane ? 0 : clock * o.spin + view.turn * .5 + lean[0] * .3);
  }

  function paint() {
    if (lost) return;
    camera = currentCamera();
    lean = mixVectors(lean, leanTarget, .06);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...rgb(o.ink), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Additive light: overlapping points brighten, as in a long exposure.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(points.program);
    gl.bindVertexArray(pointArray);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, simulation.texture);
    const u = points.uniforms;
    gl.uniform1i(u.state, 0);
    gl.uniform1i(u.n, o.n);
    gl.uniform1i(u.shape, SHAPES[o.shape]);
    gl.uniform2i(u.grid, o.columns, o.rows);
    gl.uniform2fv(u.tile, o.tile);
    gl.uniform2fv(u.radii, o.radii);
    // The pattern can slide along a surface; it wraps, so the slide never runs out.
    gl.uniform2f(u.drift, 0, (clock * o.flow) % o.n);
    gl.uniform2fv(u.fog, o.fog);
    gl.uniformMatrix4fv(u.viewProjection, false, camera.viewProjection);
    gl.uniformMatrix3fv(u.model, false, modelMatrix());
    gl.uniform3fv(u.eye, camera.eye);
    // A closed body sits beside the text where there is room, behind it where there is not.
    gl.uniform3f(u.centre, aspect() > 1.25 ? o.offset : 0, 0, 0);
    gl.uniform1f(u.extent, o.extent);
    gl.uniform1f(u.relief, o.relief * (1 + .9 * clamp01(view.agitation)));
    gl.uniform1f(u.pointScale, canvas.height * .0028);
    gl.uniform1f(u.time, clock);
    gl.uniform3fv(u.bone, rgb(o.bone));
    gl.uniform3fv(u.plasma, rgb(o.plasma));
    gl.uniform1f(u.intensity, view.intensity);
    gl.uniform1f(u.dust, o.dust);
    gl.drawArrays(gl.POINTS, 0, o.columns * o.rows);
  }

  function openWound(x, y) {
    woundLeft = o.woundSteps;
    simulation.setWound(x, y, .6);
  }

  function advance(count) {
    if (lost) return;
    for (let i = 0; i < count; i++) {
      if (woundLeft > 0 && --woundLeft === 0) simulation.setWound(0, 0, 0);
      simulation.step();
    }
  }

  function frame(now) {
    if (!running || lost) return;
    clock = now / 1000;
    // Some fields are struck at random on their own, and left to repair the damage.
    if (o.strikeEvery > 0 && now >= nextStrikeAt) {
      if (nextStrikeAt > 0) openWound(Math.random() * o.n, Math.random() * o.n);
      nextStrikeAt = now + o.strikeEvery * (.5 + Math.random());
    }
    advance(o.steps);
    paint();
    raf = requestAnimationFrame(frame);
  }

  function woundUnderPointer(ndcX, ndcY) {
    if (!camera) return;
    // Aim at the ridge tops, not the floor beneath them, so the wound opens under the pointer.
    const hit = camera.groundHit(ndcX, ndcY, o.relief * .7);
    if (!hit) return;
    const u = hit[0] / (2 * o.extent) + .5, v = hit[1] / (2 * o.extent) + .5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return;
    const now = performance.now();
    if (now - lastPointerAt > o.woundPause) wounds++;
    lastPointerAt = now;
    openWound(u * o.n, v * o.n);
  }

  // Screen position in −1…1 (y up). A dish that allows it is wounded where the
  // pointer passes; a closed body leans towards the pointer instead.
  function pointer(ndcX, ndcY) {
    if (lost) return;
    if (plane && o.pointerWounds) woundUnderPointer(ndcX, ndcY);
    else if (!plane) leanTarget = [ndcX, ndcY];
  }

  // The browser may drop the context (GPU reset, backgrounded tab); the field regrows on return.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    build();
    lost = false;
    paint();
    if (running) raf = requestAnimationFrame(frame);
  });

  build();
  paint();
  return {
    light: o.light,
    stop() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running && o.steps > 0) { running = true; raf = requestAnimationFrame(frame); } },
    advance, paint, pointer,
    // lift 0…1 raises the camera (or tips a closed body), turn rotates (radians),
    // intensity dims the light, agitation 0…1 swells the relief. Unspecified fields keep their value.
    setView(next) { view = { ...view, ...next }; },
    getStats() { return { ...simulation.getStats(), wounds, points: o.columns * o.rows }; },
  };
}
