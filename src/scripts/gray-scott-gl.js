import { GRAY_SCOTT_DEFAULTS } from './gray-scott.js';
import { link, renderTarget } from './gl-utils.js';
import { createStimulusSchedule } from './stimulus-schedule.js';

// Gray–Scott on the GPU: the chemistry runs in a fragment shader over a pair
// of float textures. Only the seed timing (stimulus-schedule.js) stays on the CPU.

const PROBES = 16;        // candidate sites sampled when placing a new seed
const PROBE_REACH = 2;    // cells either side of a candidate that count as its neighbourhood
const WOUND_RADIUS = 12;
const NUCLEUS_REACH = 3;  // half-width in cells of each initial nucleus  // cells cleared around a wound

const QUAD = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
void main() { gl_Position = vec4(corners[gl_VertexID], 0., 1.); }`;

const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D state;   // r = substrate U, g = activator V
uniform int n;
out vec4 outColor;
ivec2 wrap(ivec2 cell) { return ((cell % n) + n) % n; }
vec2 wrappedOffset(ivec2 cell, vec2 centre) {
  float size = float(n);
  return mod(vec2(cell) - centre + .5 * size, size) - .5 * size;
}`;

// One step. Stimulation and wounds are applied to every sampled cell first, so
// neighbours see them too, exactly as the CPU core mutates the field before diffusing.
const simulationSource = (maxSources) => `${HEADER}
#define MAX_SOURCES ${maxSources}
uniform float feed, kill, Du, Dv, radius;
uniform vec3 sources[MAX_SOURCES];   // x, y in cells; z = envelope (0 when idle)
uniform vec3 wound;                  // x, y in cells; z = strength (0 when idle)
vec2 cell(ivec2 at) {
  ivec2 c = wrap(at);
  vec2 uv = texelFetch(state, c, 0).rg;
  for (int i = 0; i < MAX_SOURCES; i++) {
    float envelope = sources[i].z;
    if (envelope <= 0.) continue;
    float reach = length(wrappedOffset(c, sources[i].xy)) / radius;
    if (reach >= 1.) continue;
    float falloff = 1. - reach * reach;
    uv += (vec2(.5, .55) - uv) * (.12 * envelope * falloff * falloff);
  }
  if (wound.z > 0.) {
    // A wound strips the activator and leaves bare substrate for the pattern to regrow into.
    float reach = length(wrappedOffset(c, wound.xy)) / ${WOUND_RADIUS}.;
    if (reach < 1.) uv = mix(uv, vec2(1., 0.), wound.z * (1. - reach * reach));
  }
  return uv;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 uv = cell(c);
  vec2 laplacian = cell(c + ivec2(0, -1)) + cell(c + ivec2(0, 1))
    + cell(c + ivec2(-1, 0)) + cell(c + ivec2(1, 0)) - 4. * uv;
  float reaction = uv.x * uv.y * uv.y;
  outColor = vec4(
    uv.x + Du * laplacian.x - reaction + feed * (1. - uv.x),
    uv.y + Dv * laplacian.y + reaction - (feed + kill) * uv.y, 0., 1.);
}`;

// Activator density around each candidate site, one candidate per output pixel.
const PROBE = `${HEADER}
uniform vec2 candidates[${PROBES}];
void main() {
  ivec2 centre = ivec2(candidates[int(gl_FragCoord.x)]);
  float density = 0.;
  for (int dy = -${PROBE_REACH}; dy <= ${PROBE_REACH}; dy++)
    for (int dx = -${PROBE_REACH}; dx <= ${PROBE_REACH}; dx++)
      density += texelFetch(state, wrap(centre + ivec2(dx, dy)), 0).g;
  outColor = vec4(min(1., density / ${(2 * PROBE_REACH + 1) ** 2}.), 0., 0., 1.);
}`;

// Substrate everywhere, plus `initialSeeds` small nuclei at reproducible random
// sites so growth is already under way everywhere at the first frame.
function initialField({ n, seed, initialSeeds = 0 }) {
  const field = new Float32Array(n * n * 2);
  for (let i = 0; i < field.length; i += 2) field[i] = 1;
  let randomState = (seed ^ 0x9e3779b9) >>> 0 || 1;
  const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let q = 0; q < initialSeeds; q++) {
    const x = Math.floor(random() * n), y = Math.floor(random() * n);
    for (let dy = -NUCLEUS_REACH; dy <= NUCLEUS_REACH; dy++) for (let dx = -NUCLEUS_REACH; dx <= NUCLEUS_REACH; dx++) {
      const i = (((y + dy) % n + n) % n * n + ((x + dx) % n + n) % n) * 2;
      field[i] = .5; field[i + 1] = .25;
    }
  }
  return field;
}

// Throws when float render targets are missing. The `seeds`, `noise` and
// `warmup` options of the CPU core do not apply here; see `initialSeeds`.
export function createGrayScottGL(gl, opts = {}) {
  const o = { ...GRAY_SCOTT_DEFAULTS, ...opts };
  const n = o.n;
  const maxSources = Math.max(1, o.maxSources);
  // Half-float targets are too coarse for the slow drift of the substrate, so require full floats.
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('Float render targets are unavailable');

  const schedule = createStimulusSchedule(o);
  const simulation = link(gl, QUAD, simulationSource(maxSources),
    ['state', 'n', 'feed', 'kill', 'Du', 'Dv', 'radius', 'sources', 'wound']);
  const probe = link(gl, QUAD, PROBE, ['state', 'n', 'candidates']);
  const states = [0, 1].map(() => renderTarget(gl, n, n, gl.RG32F, gl.RG, gl.FLOAT, initialField(o)));
  const probeTarget = renderTarget(gl, PROBES, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const quad = gl.createVertexArray();   // the fullscreen triangle needs no buffers
  const sourceData = new Float32Array(maxSources * 3);
  const candidateData = new Float32Array(PROBES * 2);
  const probePixels = new Uint8Array(PROBES * 4);
  let current = 0, wound = [0, 0, 0];
  let stats = { feed: o.F, kill: o.k, seeds: 0 };

  function pass(program, framebuffer, width, height) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.useProgram(program.program);
    gl.bindVertexArray(quad);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, states[current].texture);
    gl.uniform1i(program.uniforms.state, 0);
    gl.uniform1i(program.uniforms.n, n);
  }

  // Prefer sparse areas; leave the established pattern intact elsewhere.
  function pickSite(random) {
    for (let i = 0; i < PROBES * 2; i++) candidateData[i] = Math.floor(random() * n);
    pass(probe, probeTarget.framebuffer, PROBES, 1);
    gl.uniform2fv(probe.uniforms.candidates, candidateData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, PROBES, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixels);
    let best = 0;
    for (let i = 1; i < PROBES; i++) if (probePixels[i * 4] < probePixels[best * 4]) best = i;
    return { x: candidateData[best * 2], y: candidateData[best * 2 + 1] };
  }

  function step() {
    const { feed, kill, sources } = schedule.tick(pickSite);
    stats = { feed, kill, seeds: sources.length };
    sourceData.fill(0);
    sources.slice(0, maxSources).forEach(({ x, y, envelope }, i) => sourceData.set([x, y, envelope], i * 3));
    pass(simulation, states[1 - current].framebuffer, n, n);
    gl.uniform1f(simulation.uniforms.feed, feed);
    gl.uniform1f(simulation.uniforms.kill, kill);
    gl.uniform1f(simulation.uniforms.Du, o.Du);
    gl.uniform1f(simulation.uniforms.Dv, o.Dv);
    gl.uniform1f(simulation.uniforms.radius, Math.min(o.seedRadius, Math.floor((n - 1) / 2)));
    gl.uniform3fv(simulation.uniforms.sources, sourceData);
    gl.uniform3fv(simulation.uniforms.wound, wound);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    current = 1 - current;
  }

  return {
    n, step,
    get texture() { return states[current].texture; },
    // Position in cells and strength 0…1; a strength of 0 lifts the wound.
    setWound(x, y, strength) { wound = [x, y, strength]; },
    getStats() { return { steps: schedule.steps, ...stats }; },
  };
}
