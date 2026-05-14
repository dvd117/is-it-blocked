# Is It Blocked?

Censorship-evidence aggregator for Venezuelan internet users. Enter a domain and the app combines public datasets, OONI measurements, a server-side probe, and browser-side checks to explain whether the evidence is consistent with ISP-level interference.

This tool does **not** prove censorship. It shows why a conclusion is reasonable and keeps the language deliberately cautious.

Deployment URL: [`https://bloqueado.aragort.com`](https://bloqueado.aragort.com)

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm test
npm run lint
npm run build
```

## What the app checks

| Layer | Source | Purpose |
| --- | --- | --- |
| VE Sin Filtro CSV | [`bloqueos.vesinfiltro.org`](https://bloqueos.vesinfiltro.org/) via `data/blocking-data.csv` | Known Venezuela restriction reports by ISP/category. |
| OONI | OONI measurements API, `probe_cc=VE` | Recent independent measurement anomalies. |
| Server probe | `src/services/server-probe.ts` | DNS + HTTP HEAD from the deployed server as a control path. |
| Browser probe | `src/features/check/browser-probe.ts` | Connectivity from the user's current network. |
| Optional comparison | Known restricted targets from the CSV | Auto-triggers when the browser can reach a known-blocked domain, helping detect VPN/DNS bypass cases. Returns rich target objects with ISP counts and blocking methods. |

## Architecture

```text
src/
├── app/                  # Next.js App Router pages, API routes, global style imports
├── app/styles/           # Theme tokens, layout, card, report, and nerd-mode CSS
├── domain/               # Shared contracts and deterministic diagnosis engine
├── features/check/       # Check-flow browser logic and UI components
├── i18n/                 # Spanish/English message dictionaries and translation context
├── services/             # Server-side CSV, OONI, probe, report persistence services
└── theme/                # Light/dark theme context
```

Notable files:

- `src/features/check/components/phase-indicator.tsx` — phase progress indicator.
- `src/app/styles/phase-indicator.css` — phase indicator styles.

The diagnosis engine is rule-based and auditable. There is no LLM in the runtime path.

## API

- `GET /api/check?url=<domain>&lang=es|en&browserSignal=<signal>&comparisonFailed=<count>&comparisonTotal=<count>` returns CSV evidence, OONI evidence, server probe, comparison evidence for re-diagnosis, and localized diagnosis reasoning.
- `GET /api/known-tests?domain=<domain>` returns `{ targets: Array<{ domain, category, blockedOnIsps, blockedIspCount, blockingMethods }>, category }`.
- `POST /api/report` saves anonymous user reports to `data/reports.jsonl`.
- `GET /api/health` returns `{ "status": "ok" }`.

## Privacy notes

- The first check probes only the requested domain from the browser.
- Comparison probes against known restricted targets can auto-trigger when a known-blocked domain is reachable from the browser, which helps detect VPN/DNS bypass cases.
- The server-side probe is only meaningful once deployed outside the user's ISP network.

## Deployment

The repo includes a standalone Next.js Docker build and Dokploy/Traefik compose config.

```bash
npm run build
docker build -t is-it-blocked .
```

Production target: [`https://bloqueado.aragort.com`](https://bloqueado.aragort.com).