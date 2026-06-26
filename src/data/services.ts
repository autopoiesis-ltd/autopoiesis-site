export type ServiceStatus = 'available' | 'in-development';

export interface ServiceSection {
  heading: string;
  body: string[];
}

export interface Service {
  /** URL slug under /services/ */
  slug: string;
  /** Two-digit display number */
  num: string;
  /** Short title used in nav, cards, and page heading */
  title: string;
  /** One-line summary for the dropdown and grid cards */
  summary: string;
  /** Engagement shape shown on the services card grid (e.g. "2–6 weeks", "Ongoing"). */
  engagement: string;
  /** Lead sentence on the detail page */
  lede: string;
  /** Availability — drives the "in development" badge */
  status: ServiceStatus;
  /** Optional short badge label (e.g. for in-development services) */
  badge?: string;
  /** Body sections of the detail page */
  sections: ServiceSection[];
  /** Concrete artifacts the client receives */
  deliverables: string[];
  /** Who this engagement is for */
  idealFor: string;
}

export const services: Service[] = [
  {
    slug: 'red-teaming',
    num: '01',
    title: 'Red teaming agentic systems',
    summary: 'Adversarial testing of autonomous agents — before an attacker gets there first.',
    engagement: '2–6 weeks',
    lede: 'We attack your agents the way a motivated adversary would, and hand you a reproducible map of what breaks.',
    status: 'available',
    sections: [
      {
        heading: 'What we test for',
        body: [
          'We probe the failure modes specific to systems that reason, call tools, and act: direct and indirect prompt injection, tool misuse, privilege and scope escalation, data exfiltration through tool outputs, jailbreaks that survive your system prompt, and emergent behaviour that no single component was designed to produce.',
          'Testing covers the whole loop — model, orchestration layer, tool surface, memory, and the trust boundaries between your agent and the systems it can reach.',
        ],
      },
      {
        heading: 'How we work',
        body: [
          'We start from your architecture and threat model, then run a structured campaign that combines manual adversarial prompting, automated attack generation, and replayable exploit chains. Every finding ships with a concrete reproduction, an impact rating, and a suggested fix — not just a score.',
          'Engagements can be one-off (pre-launch hardening) or continuous (a standing adversary against each release).',
        ],
      },
    ],
    deliverables: [
      'Threat model and attack-surface map for your agent',
      'Reproducible exploit chains with severity ratings',
      'Findings report with prioritised, actionable remediations',
      'Retest of fixed issues to confirm closure',
    ],
    idealFor: 'Teams shipping agentic products who need an independent adversary before — and after — they go live.',
  },
  {
    slug: 'secure-agent-build',
    num: '02',
    title: 'Building secure agentic systems',
    summary: 'Agentic architectures with security designed in, not bolted on.',
    engagement: '1–6 months',
    lede: 'We design and build agent systems where the dangerous failure modes are engineered out from the start.',
    status: 'available',
    sections: [
      {
        heading: 'Security by construction',
        body: [
          'Most agent vulnerabilities are architectural, not incidental. We build systems around least-privilege tool access, sandboxed execution, strict input/output mediation, and guardrails that hold even when the model is adversarially steered.',
          'That means scoping every tool to the minimum capability it needs, isolating untrusted content from privileged actions, and making the blast radius of any single compromised step small and observable.',
        ],
      },
      {
        heading: 'From design to runtime',
        body: [
          'We work alongside your engineers — from architecture and threat modelling through implementation, runtime monitoring, and incident-ready logging. The result is a system you can reason about, audit, and operate safely in production.',
          'We can lead the build, embed with your team, or review and harden an architecture you already have.',
        ],
      },
    ],
    deliverables: [
      'Secure agent architecture and threat model',
      'Sandboxing and least-privilege tool-access design',
      'Guardrail and policy enforcement layer',
      'Runtime monitoring, logging, and alerting for agent behaviour',
    ],
    idealFor: 'Teams building agents that take real-world actions and need defensible security from day one.',
  },
  {
    slug: 'advisory',
    num: '03',
    title: 'Advisory & architecture review',
    summary: 'Architecture review, threat modelling, and ongoing security advisory.',
    engagement: 'Ongoing',
    lede: 'Senior security judgement on tap — to pressure-test decisions before they ship.',
    status: 'available',
    sections: [
      {
        heading: 'Architecture & threat-model review',
        body: [
          'We review your agentic system design against a structured threat model and tell you, concretely, where the risk concentrates and what to do about it. You get a clear, prioritised picture rather than a generic checklist.',
          'Reviews are scoped to your stack — model providers, orchestration framework, tool surface, data flows, and the trust boundaries between them.',
        ],
      },
      {
        heading: 'Ongoing advisory',
        body: [
          'For teams that want security expertise without a full-time hire, we offer retained advisory: design reviews on new features, a sounding board for risk decisions, and guidance on building a security practice around agentic systems as you scale.',
        ],
      },
    ],
    deliverables: [
      'Architecture and threat-model review with prioritised findings',
      'Design feedback on new agentic features and tools',
      'Security roadmap tailored to your stage and stack',
      'Retained advisory on a cadence that fits your team',
    ],
    idealFor: 'Teams who want experienced security input on agentic decisions without staffing a full security team.',
  },
  {
    slug: 'reinforcement-learning',
    num: '04',
    title: 'Reinforcement learning as a service (RLaaS)',
    summary: 'End-to-end RL — environment design, reward modelling, training, and evaluation.',
    engagement: 'Product · in development',
    lede: 'Reinforcement learning delivered end to end, tuned to security and robustness objectives specific for your organisation',
    status: 'in-development',
    badge: 'In development',
    sections: [
      {
        heading: 'What it covers',
        body: [
          'We design the environment in conjunction with your security team, shape the reward model, run training, and build the evaluation harness. All of this is delivered as a managed service rather than a research project you have to staff and maintain.',
        ],
      },
      {
        heading: 'Status',
        body: [
          'This offering is currently in development. If reinforcement learning is on your cybersecurity roadmap, get in touch — we are taking early conversations and design partners now.',
        ],
      },
    ],
    deliverables: [
      'Environment and task design',
      'Reward modelling and shaping',
      'Training pipeline and runs',
      'Evaluation harness and reporting',
    ],
    idealFor: 'Cybersecurity teams with RL on the roadmap who want it delivered and evaluated, not just prototyped.',
  },
  {
    slug: 'cyber-reasoning-systems',
    num: '05',
    title: 'Private Cyber-Reasoning-Systems (PCRS)',
    summary: "A private autonomous cyber capability that autonomously detects, patches and verifies resolution to your internal source code vulnerabilities.",
    engagement: 'Product · in development',
    lede: "Empower your internal security teams with a privately hosted Cyber Reasoning System (PCRS)",
    status: 'in-development',
    badge: 'In development',
    sections: [
      {
        heading: 'What it covers',
        body: [
          'CRSs were defined by DARPA (originally in 2016) as autonomous cybersystems that discover and remediate vulnerabilities in your source code. Deploying and designing an agentic CRS, however, is a complex endeavour which requires domain expertise that is not largely prevelant amongst cybersecurity teams. We want to make sure every organisation has an empowered cybersecurity capability, and hence are building out a private CRS module that can be deployed in your cloud environment, or on your premises. Bring-your-own-key (BYOK) for inference providers, or alternatively, host the models on our infrastructure.',
        ],
      },
      {
        heading: 'Status',
        body: [
          'This offering is currently in development. If this offering excites you, get in touch — we are taking early conversations and design partners.',
        ],
      },
    ],
    deliverables: [
      'Autonomous cyber-capability',
      'Inhouse expertise in CRSs'
    ],
    idealFor: 'Teams with a budget for deploying CRSs internally who value privacy with regards to their cybersecurity data.',
  },
  
];

export const getService = (slug: string): Service | undefined =>
  services.find((s) => s.slug === slug);
