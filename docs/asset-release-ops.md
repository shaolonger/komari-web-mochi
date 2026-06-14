# Asset Release Ops Reference

Last updated: 2026-06-14

## Purpose

This document is the maintenance-facing companion to `docs/asset-release-regression.md`.

It answers four practical questions:

1. which asset fields are now part of the supported governance surface
2. what each asset KPI or label means
3. what must be checked before release
4. how to roll back safely if the release must be reverted

## Core asset fields

| Field | Source repo | Meaning | Typical UI consumers |
| --- | --- | --- | --- |
| `provider` | `komari` | vendor or seller of the asset | asset view, stats modal, `/manage` filters, provider aggregation |
| `currency` | `komari` | original billing symbol | node cards, asset detail, `/manage` inventory |
| `currency_code` | `komari` | normalized billing currency code | FX conversion, aggregation, governance completeness |
| `price` | `komari` | cycle price in native currency | KPI, inventory, summary, renewal exposure |
| `billing_cycle` | `komari` | billing period in days | monthly normalization, annualization, remaining value |
| `expired_at` | `komari` | asset expiry or renewal deadline | renewal timeline, high-risk detection |
| `auto_renewal` | `komari` | whether renewal is automatic | risk reasons, manual-renew queue, details |
| `asset_ignored` | `komari` | exclude asset from spend-focused portfolio totals | summary, queues, inventory filter |
| `business_role` | `komari` | business intent of the node | decision labels, detail drawer, `/manage` |
| `public_remark` | `komari` | short operator-facing description | cards, details, search |
| `governance_status` | `komari` | manual governance state such as `observe` or `ignored` | `/manage`, inventory, filtering |
| `governance_note` | `komari` | operator note explaining governance intent | `/manage`, inventory detail |
| capability flags | `komari-agent` -> `komari` | whether the agent can ping, exec, auto-update, etc. | risk scoring, details, Ops Assurance |

## KPI and label glossary

| Metric or label | Meaning |
| --- | --- |
| `Monthly spend` | asset cost normalized to a 30-day month |
| `Annualized spend` | normalized monthly spend multiplied by 12 |
| `Remaining value` | prepaid, unconsumed value estimated from expiry runway |
| `7-day renewal exposure` | next-cycle spend that must be renewed inside the next 7 days |
| `30-day renewal exposure` | next-cycle spend that falls due inside the next 30 days |
| `High risk` | combined expiry, traffic, telemetry, capability, token, or offline pressure crosses the configured threshold |
| `Underused` | paid asset with persistently weak utilization and no protected-role exclusion |
| `Retain` | keep the asset, it is healthy and still useful |
| `Observe` | keep the asset but watch a risk, metadata gap, or protected low-utilization case |
| `Renew` | actively renew or confirm the next cycle because runway is short |
| `Reclaim` | candidate for retirement because spend continues without enough value |
| `Value score` | composite practical-value score based on role, utilization, control coverage, runway, and metadata quality |
| `Risk score` | composite operational-risk score based on expiry, telemetry, capabilities, token state, and failure signals |

## Release checklist

Complete every item before a production release:

1. Verify asset formulas:
   - `npm run audit:asset-release`
   - confirm backend parity in `/Users/shaolong/Code/personal/komari` with the admin asset tests
2. Verify theme build:
   - `npm run build`
3. Verify compatibility fallbacks:
   - `npm run audit:asset-compat`
   - confirm no regression in `src/lib/nodePayload.ts` and `src/lib/assetAdminApi.ts`
4. Verify page shells with fixture data:
   - start `npm run mock:asset-regression-api`
   - start `npm run dev -- --host 127.0.0.1 --port 4173`
   - confirm homepage asset view, stats modal, detail drawer, and `/manage` workbench at desktop and mobile sizes
5. Verify server/API alignment:
   - confirm `/api/public/asset-fx`, `/api/admin/client/asset-summary`, `/api/admin/client/asset-issues`, and `/api/admin/client/assets` still match the front-end contracts
6. Verify operational governance behavior:
   - token attention counts render
   - observation quality renders
   - version drift renders
   - capability gaps render

## Rollback checklist

If release rollback is required:

1. Revert the front-end deployment to the previous theme bundle.
2. Revert the Komari server deployment to the previous asset API version if the API contract changed together with the front-end release.
3. Validate that these endpoints return the previous known-good payloads:
   - `/api/nodes`
   - `/api/public`
   - `/api/public/asset-fx`
   - `/api/admin/client/asset-summary`
   - `/api/admin/client/asset-issues`
   - `/api/admin/client/assets`
4. Re-run:
   - `npm run build`
   - `npm run audit:asset-release`
5. Open the homepage and `/manage` once against the rolled-back server and verify:
   - homepage does not hard-fail
   - asset view opens
   - `/manage` loads without JSON parsing or missing-field errors
6. Record which contract or field caused the rollback so the next release can add a targeted fixture or audit case.

## Notes for future maintenance

- Keep the mock API script aligned with the fields that the asset view and `/manage` depend on most.
- When a new governance field is added server-side, update:
  - `scripts/asset-regression-mock-server.mjs`
  - `docs/asset-release-ops.md`
  - `docs/komari-asset-board-v2-progress.md`
- Prefer expanding `scripts/asset-release-audit.ts` for formula or compatibility changes before relying only on manual UI checks.
