// One living field, several bodies. Each page picks a variant: a surface for
// the field to live on, a chemistry (which decides the kind of pattern that
// grows), a camera, and how the field is disturbed.

// Gray–Scott feed and kill rates. Small changes here change the species of pattern.
const LABYRINTH = {};                                                         // winding ridges (the core's defaults)
const DIVIDING_SPOTS = { F: .0367, k: .0649, breathe: .0005, feedBreathe: .0002 };   // spots that grow, pinch and split
const CORAL = { F: .0545, k: .062, breathe: .0006, feedBreathe: .0002 };      // dense branching growth
const MESH = { F: .039, k: .058, breathe: .0006, feedBreathe: .0002 };        // a connected net with holes

const BASE = Object.freeze({
  shape: 'plane',            // 'plane' (an open dish), 'sphere' (a closed body) or 'tube' (seen from inside)
  n: 256, steps: 8, seedEvery: 110, seedDuration: 180, breathePeriod: 3600, maxSources: 6,
  initialSeeds: 36,          // nuclei already present at the first frame
  columns: 600, rows: 600,   // points across and along the surface
  tile: [1, 1],              // how many times the field repeats across and along it (sphere: across its width)
  extent: 1.5,               // plane: half-width of the dish in world units
  radii: [1, 1],             // sphere: radius (second value unused); tube: radius and length
  relief: .12,               // height of fully grown pattern above the surface
  dust: .07,                 // brightness of bare surface, relative to grown pattern
  fovY: .62,
  fog: [1.1, 3.6],           // distance at which points start to fade, and where they are gone
  // plane: the camera glides from the low view to the high view as the page scrolls
  lowView: { eye: [0, .46, 1.36], target: [0, 0, .12] },
  highView: { eye: [0, 1.5, 1.05], target: [0, 0, 0] },
  heading: 0,                // plane: resting orbit angle of the camera (radians)
  view: { eye: [0, 0, 3.2], target: [0, 0, 0] },   // sphere and tube: a fixed camera
  offset: 0,                 // closed bodies: shift to the right of the text on wide screens
  tilt: 0, spin: 0,          // closed bodies: resting tilt (radians) and turn rate (radians per second)
  flow: 0,                   // cells per second the pattern slides along the surface
  pointerWounds: false,      // plane: the pointer clears the pattern where it passes
  strikeEvery: 0,            // ms between wounds that open at random by themselves (0 = never)
  woundSteps: 14,            // simulation steps a wound stays open
  woundPause: 400,           // ms without pointer movement before the next touch counts as a new wound
  // Brightness at the top of the page, and behind the content once scrolled.
  light: { top: .6, rest: .28 },
  ink: [0x14, 0x12, 0x10], bone: [0xF4, 0xF0, 0xE8], plasma: [0x7B, 0x3F, 0xE4] });

const variant = (...parts) => Object.freeze(Object.assign({}, BASE, ...parts));
const CLOSED_BODY = { shape: 'sphere', n: 192, steps: 6,
  columns: 620, rows: 520,   // only their product matters on a sphere: the number of points
  radii: [.74, 0], relief: .07, dust: .16,   // brighter dust, so the bare surface still reads as a body
  offset: 1.2, light: { top: .8, rest: .5 } };

export const FIELD_VARIANTS = Object.freeze({
  // Home: an open culture you can wound and watch regrow.
  culture: variant(LABYRINTH, { pointerWounds: true, light: { top: 1, rest: .2 } }),
  // Services index: the same culture seen from above, kept quiet behind the cards.
  overview: variant(LABYRINTH, { lowView: BASE.highView, light: { top: .45, rest: .2 } }),
  // About: a single cell — a closed membrane with spots dividing across it.
  membrane: variant(DIVIDING_SPOTS, CLOSED_BODY, { tilt: 1.05, spin: .05 }),
  // Red teaming: a field under continuous attack, seen low and close.
  breach: variant(LABYRINTH, { pointerWounds: true, strikeEvery: 1400, heading: .9,
    lowView: { eye: [0, .34, 1.2], target: [0, 0, .1] }, light: { top: .5, rest: .28 } }),
  // Secure agentic systems: structure by construction — a connected mesh.
  lattice: variant(MESH, { heading: -.5,
    lowView: { eye: [0, .8, 1.3], target: [0, 0, 0] }, highView: { eye: [0, 1.7, .9], target: [0, 0, 0] } }),
  // Advisory: the whole terrain surveyed from above.
  survey: variant(CORAL, { fog: [2.2, 5],
    lowView: { eye: [0, 2.1, .7], target: [0, 0, 0] }, highView: { eye: [0, 2.6, .5], target: [0, 0, 0] },
    light: { top: .55, rest: .28 } }),
  // AI research platform: a specimen under the microscope.
  specimen: variant(DIVIDING_SPOTS, { n: 192, extent: 1.2, relief: .08, fog: [1.6, 4.2],
    lowView: { eye: [0, 1.45, .35], target: [0, 0, 0] }, highView: { eye: [0, 2.2, .3], target: [0, 0, 0] },
    light: { top: .65, rest: .3 } }),
  // Private cyber reasoning systems: a closed body that is damaged at random and repairs itself.
  repair: variant(LABYRINTH, CLOSED_BODY, { tilt: .5, spin: -.04, strikeEvery: 2200, woundSteps: 18 }),
  // RSI verifier: travelling down a tube whose wall keeps regenerating — one generation after another.
  ascent: variant(LABYRINTH, { shape: 'tube', columns: 520, rows: 1040, tile: [1, 2],
    radii: [.5, 6.28], relief: .06, fog: [1.2, 5.2], flow: 6, spin: .02,
    view: { eye: [0, 0, 2.9], target: [0, 0, -3] }, light: { top: .7, rest: .35 } }),
});
