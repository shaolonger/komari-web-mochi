# Asset Release Regression Guide

Last updated: 2026-06-14

## Goal

This guide records the release-readiness regression path for the asset work completed across:

- `/Users/shaolong/Code/personal/komari`
- `/Users/shaolong/Code/personal/komari-agent`
- `/Users/shaolong/Code/personal/komari-web-mochi`

It is intentionally split into:

1. deterministic data and formula verification
2. compatibility verification for legacy payloads
3. page-shell and responsive verification using a reproducible local mock API

## Fixture setup

Use the bundled mock API when the real Komari backend is not running locally.

1. Start the mock API:

```bash
npm run mock:asset-regression-api
```

2. In another terminal, start the theme in development mode:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

The Vite development server already proxies `/api/*` to `http://127.0.0.1:25774`, so the fixture API will feed the real routes with stable asset-heavy data.

## Mandatory verification commands

Run these commands before marking release readiness complete:

```bash
npm run audit:asset-release
npm run build
npx eslint src/lib/nodePayload.ts src/lib/assetAdminApi.ts src/contexts/NodeListContext.tsx
```

Server-side parity for asset summary and inventory should also be checked in the Komari repo:

```bash
mkdir -p /tmp/komari-gocache
GOCACHE=/tmp/komari-gocache go test ./api/admin -run 'TestBuildClientAssetSummary|TestBuildClientAssetInventoryFiltersAndSorts|TestBuildClientAssetInventoryIncludesGovernanceAndValueSignals'
```

## Desktop and mobile regression matrix

Viewport matrix used for release audit:

| Surface | Desktop target | Mobile target | What to verify | Status |
| --- | --- | --- | --- | --- |
| `/` homepage shell | 1440x960 | 390x844 | navbar renders, status bar renders, home asset overview renders, no hard crash | PASS |
| `/` asset view | 1440x960 | 390x844 | asset KPI header, asset list, stats modal entry, renewal timeline, risk/decision filters visible | PASS |
| `/` asset detail drawer | 1440x960 | 390x844 | provider, role, billing, capability, risk, and 1h/7d summary blocks render without overflow | PASS |
| `/manage` workbench | 1440x960 | 390x844 | portfolio summary, issue queues, Ops Assurance, inventory table/cards, batch form shell render | PASS |
| `/manage` responsive stacking | 1440x960 | 390x844 | governance sections stack without horizontal clipping on mobile | PASS |

## Verification notes

Release evidence captured against the current implementation:

- Build and asset audits:
  - `npm run audit:asset-release` passed.
  - `npm run build` passed.
- Compatibility:
  - `npx eslint src/lib/nodePayload.ts src/lib/assetAdminApi.ts src/contexts/NodeListContext.tsx` passed with warnings only from pre-existing `NodeListContext.tsx` hook/export rules.
  - `npm run audit:asset-compat` passed.
- Server parity:
  - `go test ./api/admin -run 'TestBuildClientAssetSummary|TestBuildClientAssetInventoryFiltersAndSorts|TestBuildClientAssetInventoryIncludesGovernanceAndValueSignals'` passed in `/Users/shaolong/Code/personal/komari`.
- Browser-level page checks:
  - the homepage loaded against the fixture API with `defaultViewMode=asset`.
  - the asset view exposed KPI cards, renewal timeline, aggregation controls, risk/decision lanes, list rows/cards, and the stats dialog entry.
  - the mobile asset cards opened the drawer successfully and rendered business metadata, financial snapshot, capability flags, and 1h/7d summaries.
  - the management workbench rendered authenticated summary cards, issue queues, Ops Assurance, batch-edit controls, and inventory content using fixture data.
  - mobile viewport checks confirmed that the asset layout and management workbench switched to stacked cards without horizontal overflow.

## Known verification boundary

The fixture server is only for theme release regression. It does not replace:

- end-to-end verification against a real Komari backend
- real exchange-rate refresh behavior against the live FX source
- production authentication and notification integrations

Those paths remain covered by backend tests, targeted manual validation in the real environment, and the existing asset math / compatibility audits.
