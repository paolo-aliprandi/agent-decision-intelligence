# ADI — Agent Decision Intelligence

**Live site:** [paolo-aliprandi.github.io/agent-decision-intelligence](https://paolo-aliprandi.github.io/agent-decision-intelligence/)

A deliberately editorial landing page for an early-stage, independent agent-evaluation project. The product idea: help teams choose agents for a specific workflow using evidence about outcomes, cost, risk, and oversight—not a universal leaderboard.

## Develop

Node.js 22.12+ and npm are required.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/agent-decision-intelligence/`.

## Verify

```sh
npm run format:check
npm run build
npx playwright install chromium
npm test
```

The browser tests cover desktop/mobile layout, keyboard navigation, the scroll narrative, the cost model, pilot-enquiry handoff, reduced motion, no-JavaScript content, and automated accessibility checks.

## Design and implementation

- Warm paper, forest green, restrained orange, editorial typography, and an original layered SVG evaluation illustration.
- Desktop sticky scrollytelling with explicit stage buttons; a linear narrative and the same controls on mobile.
- Accessible native dialog, range input, progressive static HTML, and reduced-motion support.
- Vite and TypeScript, without an application framework or animation library.
- Self-hosted DM Sans and Instrument Serif via Fontsource; no third-party runtime requests.
- No analytics, tracking cookies, backend, or stored enquiry data.

All comparison counts and costs are **synthetic explanatory examples**, never customer results. The model exposes its assumptions and excludes several real-world factors. It is not a production evaluation tool or a safety guarantee.

The pilot form opens a prefilled **public GitHub issue** for the visitor to review and submit. It explicitly warns against including confidential or personal information. A production private enquiry channel should replace this handoff once one has been established.

## Deployment

The GitHub Actions workflow checks formatting, builds, runs browser/accessibility tests, and deploys to GitHub Pages on successful pushes to `main`. Enable Pages with **GitHub Actions** as the source. `vite.config.ts` sets the repository subpath; change that and the canonical/Open Graph URLs if the site moves to a custom domain.

The original strategy document is intentionally not included in this public repository. This site describes a service-led project seeking design partners; it does not claim existing customers, validated results, certifications, or a shipped evaluation platform.
