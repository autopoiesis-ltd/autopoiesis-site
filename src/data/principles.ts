export interface Principle {
  /** Two-digit display number */
  num: string;
  /** The security imperative */
  term: string;
  /** The autopoietic concept it derives from */
  bio: string;
  /** How the biological principle maps to securing autonomous systems */
  body: string;
}

// The three properties of an autopoietic system (Maturana & Varela),
// mapped onto what security for autonomous systems has to become.
export const principles: Principle[] = [
  {
    num: '01',
    term: 'Evolve',
    bio: 'Structural coupling',
    body:
      'A living system endures by continuously adapting to its environment without losing what makes it itself. Security for autonomous systems has to do the same — sensing, learning from, and adapting to a threat landscape that shifts faster than any release cycle, rather than standing behind a fixed perimeter.',
  },
  {
    num: '02',
    term: 'Contain',
    bio: 'Operational closure',
    body:
      'A cell produces a membrane that separates self from non-self and keeps its internal processes coherent. Agentic systems need the same: explicit trust boundaries, least privilege, and sandboxing — so a single compromise stays contained and the blast radius is bounded by design.',
  },
  {
    num: '03',
    term: 'Sustain',
    bio: 'Self-production',
    body:
      'Life persists by constantly regenerating its own components. Security is not a one-off audit but a self-sustaining loop — test, learn, harden, and regenerate defences continuously, as the system and its adversaries co-evolve.',
  },
];
