# Komari Asset Practicality Board v2 Progress

Audit date: 2026-06-13  
Audit scope:
- `/Users/shaolong/Code/personal/komari`
- `/Users/shaolong/Code/personal/komari-agent`
- `/Users/shaolong/Code/personal/komari-web-mochi`

Status legend:
- `TODO`: not started
- `DOING`: actively being developed in the current worktree
- `REVIEW`: partially implemented or implemented but still missing part of the acceptance scope
- `DONE`: current repository state already provides the capability
- `BLOCKED`: blocked by dependency or external condition

## 1. Audit basis

Key evidence used in this audit:

- Theme asset view and modal:
  - `src/components/AssetView.tsx`
  - `src/components/AssetStatsModal.tsx`
  - `src/components/AssetDetailsDialog.tsx`
  - `src/components/ViewModeSelector.tsx`
  - `src/components/NodeDisplay.tsx`
- Theme management workbench:
  - `src/pages/manage.tsx`
  - `src/lib/assetAdminApi.ts`
  - `src/components/Login.tsx`
- Theme data mapping and metrics:
  - `src/contexts/NodeListContext.tsx`
  - `src/utils/assetMetrics.ts`
  - `src/utils/assetSignals.ts`
  - `src/components/NodeModernCardStatic.tsx`
  - `src/components/NodeCompactCard.tsx`
  - `src/pages/Index.tsx`
- Server-side asset model and APIs:
  - `database/models/models.go`
  - `database/clients/client.go`
  - `api/admin/client.go`
  - `api/admin/client_asset_summary.go`
  - `api/admin/client_asset_issues.go`
  - `api/admin/client_asset_inventory.go`
  - `cmd/server.go`
- Agent capability reporting:
  - `server/basicInfo.go`
  - `server/basicInfo_test.go`

Recent feature commits already present in the audited branches:

- `komari`
  - `19c3b6b Add asset metadata fields and validation`
  - `af658ec Persist agent capability metadata`
  - `2ad23c3 Add admin asset portfolio summary API`
  - `62410b0 Add filters to admin asset summary`
  - `e582754 Add batch asset edit API`
  - `4ced7c5 Add admin asset issues API`
  - `b0a0c76 Add admin asset inventory API`
- `komari-agent`
  - `cfd0483 Report agent capabilities in basic info`
- `komari-web-mochi`
  - `ffc078a Add asset metric helpers to the theme`
  - `9daaac5 Add asset view MVP to the theme`
  - `a66b234 Add capability-aware asset details`
  - `15dcdf6 Expand asset portfolio statistics`
  - `4c836ec Add asset action queues and filters`
  - `c38207c Add asset dimension filters`
  - `a55e33d Build asset operations workbench`

## 2. Coverage checklist

| Item | Status | Notes |
| --- | --- | --- |
| Independent asset view | DONE | `ViewModeSelector.tsx` and `NodeDisplay.tsx` already expose `asset` view mode. |
| Asset statistics modal | DONE | `AssetStatsModal.tsx` is wired from `AssetView.tsx`. |
| Asset count / monthly / annualized / remaining value | DONE | KPI and modal are present in `AssetView.tsx` and `AssetStatsModal.tsx`. |
| Provider aggregation | DONE | Implemented in `AssetView.tsx`, `AssetStatsModal.tsx`, and backend summary API. |
| FX display and refresh | REVIEW | Theme supports manual normalization state; backend FX source/update flow is not built yet. |
| Renewal exposure | DONE | 7-day and 30-day exposure exist in theme and backend summary. |
| High-risk asset identification | DONE | `risk_score`, `high_risk`, issue queues, and filters already exist. |
| Idle / underused asset identification | DONE | `src/utils/assetSignals.ts` now excludes protected assets from reclaim suggestions, `AssetView.tsx` exposes idle-spend filters/queues, and details show estimated monthly waste. |
| Asset decision labels | DONE | `src/utils/assetSignals.ts` and `AssetView.tsx` now emit and display retain / observe / renew / reclaim labels with filter support. |
| Node card asset semantics enhancement | REVIEW | Price and expiry tags exist; role, remark, and auto-renew signaling are not fully surfaced on cards. |
| Homepage alert strip | DONE | `HomeAssetOverview.tsx` adds homepage alert cards for offline, renew-soon, traffic, network quality, and stale telemetry, with routing into asset filters. |
| Latency / loss summary frontload | DONE | `HomeAssetOverview.tsx` adds a 1h network watch block with latency/loss/jitter summary support and a graceful empty state. |
| `public_remark` / `auto_renewal` field usage | DONE | Both are mapped in `NodeListContext.tsx`; `public_remark` is used by asset details and search. |
| Backend asset fields (`provider`, `currency_code`, `asset_ignored`, `business_role`) | DONE | Server model, validation, and APIs are already present. |
| Admin-side asset editing and completeness validation | REVIEW | Batch edit and metadata-gap surfacing exist, but a dedicated core admin edit experience is still incomplete. |
| Asset governance panel | REVIEW | Theme `/manage` provides an operations workbench, but the core admin side is not fully closed. |
| Token / notification / task-result / agent-version governance | REVIEW | Token lifecycle endpoints exist; a unified governance panel is still missing. |
| Agent capability reporting | DONE | Agent reports capability flags in `server/basicInfo.go`, server persists them. |
| Capability gaps included in asset risk | DONE | Backend issue reasons and frontend asset details already surface capability-related risk. |
| Asset value / risk scoring | DONE | Theme-side value/risk scoring and explanation are now exposed through `src/utils/assetSignals.ts`, `AssetView.tsx`, and `AssetDetailsDialog.tsx`. |

## 3. Milestones

| Milestone | Goal | Completion condition | Status | Notes |
| --- | --- | --- | --- | --- |
| M1 | Asset data foundation | Core asset fields can be maintained, distributed, and consumed | REVIEW | Field model and APIs are done, but maintenance UX and validation loop are only partially closed. |
| M2 | Asset view MVP | Front-end asset view, KPI, and inventory are usable | DONE | `AssetView.tsx`, `AssetStatsModal.tsx`, and the drawer-based `AssetDetailsDialog.tsx` now satisfy the MVP asset-view loop. |
| M3 | Risk and governance loop | Renewals, risk, capability, and ops assurance all visible | REVIEW | Risk queues exist; homepage and governance panels are still incomplete. |
| M4 | Decision support enhancement | Idle detection, decision labels, and scoring go live | REVIEW | Theme-side decision support is live, but server-side traceable value-scoring (`C06`) still needs to be finalized. |
| M5 | Release readiness | Regression passed, docs complete, ready to ship | TODO | Still missing final regression matrix, compatibility audit, and release docs. |

## 4. Detailed task board

### A. Theme and user-visible pages

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| A01 | DONE | P0 | `komari-web-mochi` | Add independent Asset view entry | `ViewModeSelector.tsx` exposes `asset`; `NodeDisplay.tsx` renders `AssetView`. |
| A02 | DONE | P0 | `komari-web-mochi` | Asset KPI header | `AssetView.tsx` already shows filtered assets, monthly, annualized, remaining, renewal, and risk KPIs. |
| A03 | DONE | P0 | `komari-web-mochi` | `AssetStatsModal` statistics dialog | `AssetStatsModal.tsx` exists and is triggered from `AssetView.tsx`. |
| A04 | DONE | P0 | `komari-web-mochi` | Asset inventory main view | `AssetView.tsx` supports search, sort, filter, mobile cards, table view, and empty-state handling. |
| A05 | DONE | P1 | `komari-web-mochi` | Asset detail drawer / side panel | `AssetDetailsDialog.tsx` now uses the drawer component, shows provider/role/billing/capabilities/risk, and includes 1h operational summary plus 7d action summary without losing list filter state. |
| A06 | TODO | P1 | `komari-web-mochi` | Renewal timeline | No dedicated timeline view or clickable time-bucket flow is present yet. |
| A07 | DONE | P1 | `komari-web-mochi` | Risk layered filtering | `AssetView.tsx` now supports high / medium / low risk bands, one-click chips, and consistent risk explanations sourced from `src/utils/assetSignals.ts`. |
| A08 | DONE | P1 | `komari-web-mochi` | Homepage top alert summary strip | `HomeAssetOverview.tsx` now surfaces offline, renew-soon, traffic, network-quality, and stale-telemetry alerts, and verified routing into asset filters. |
| A09 | REVIEW | P1 | `komari-web-mochi` | Node card asset semantics enhancement | `NodeModernCardStatic.tsx` and `NodeCompactCard.tsx` show asset price and expiry tags, but `public_remark`, business role, and explicit auto-renew state are not fully expressed. |
| A10 | DONE | P1 | `komari-web-mochi` | Frontload latency / packet loss summary | Homepage now includes a `1h network watch` block that surfaces average latency, packet loss, and jitter support with ping-summary fallback and empty-state handling. |
| A11 | DONE | P1 | `komari-web-mochi` | Asset decision label system | `AssetView.tsx` and `AssetDetailsDialog.tsx` now show retain / observe / renew / reclaim labels, reasons, summaries, and filter lanes. |
| A12 | DONE | P1 | `komari-web-mochi` | Idle / underused asset view | `src/utils/assetSignals.ts` adds protected-node exclusion and waste estimation; `AssetView.tsx` surfaces reclaim candidates separately from protected low-utilization assets. |
| A13 | REVIEW | P2 | `komari-web-mochi` | Provider / group / currency aggregation analysis | Provider and currency aggregation are present; group-specific aggregation switching is still incomplete. |
| A14 | DONE | P2 | `komari-web-mochi` | Asset value score and risk score display | `AssetView.tsx` now shows sortable value/risk scores and `AssetDetailsDialog.tsx` explains their breakdowns for every asset. |

### B. Front-end data mapping and calculation rules

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| B01 | DONE | P0 | `komari-web-mochi` | Complete theme-side data mapping | `NodeListContext.tsx` already maps `public_remark`, `auto_renewal`, `provider`, `business_role`, `currency_code`, `asset_ignored`, and capability flags. |
| B02 | DONE | P0 | `komari-web-mochi` | Asset metrics helper layer | `src/utils/assetMetrics.ts` centralizes monthly, annualized, remaining value, renewal exposure, grouping, and FX normalization helpers. |
| B03 | DONE | P1 | `komari-web-mochi` | Risk rule calculation layer | `src/utils/assetSignals.ts` now centralizes risk-band calculation, risk reasons, and reusable signals consumed by the asset view. |
| B04 | DONE | P1 | `komari-web-mochi` | Underused and decision rule layer | `src/utils/assetSignals.ts` now centralizes underused detection, protected-asset exclusion, waste estimates, and retain/observe/renew/reclaim decisions. |
| B05 | DONE | P2 | `komari-web-mochi` | Score-consumption layer | `AssetView.tsx` and `AssetDetailsDialog.tsx` now consume value/risk scores with sortable list display and detailed explanation blocks. |

### C. Server-side data model and APIs

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| C01 | DONE | P0 | `komari` | Asset core field expansion | `database/models/models.go` now includes `provider`, `currency_code`, `asset_ignored`, `business_role`, `auto_renewal`, and related fields. |
| C02 | DONE | P0 | `komari` | Client asset field API integration | Field read/write is available through `/api/nodes`, admin asset APIs, and validation in `database/clients/client.go`. |
| C03 | DONE | P1 | `komari` | Asset summary API | `GetClientAssetSummary`, `GetClientAssetIssues`, and `GetClientAssetInventory` are all wired in `cmd/server.go`. |
| C04 | TODO | P1 | `komari` | FX capability and update time | No server-side FX source, refresh endpoint, or persistent update time is implemented yet. |
| C05 | DONE | P1 | `komari` | Backend risk support | `api/admin/client_asset_issues.go` and related assessment code already output risk flags, reasons, and counts. |
| C06 | REVIEW | P2 | `komari` | Asset scoring output | `risk_score` and `efficiency_score` are already returned, but a stable value-score model with factor traceability is not complete. |

### D. Management and governance capabilities

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| D01 | REVIEW | P0 | `komari` | Maintain asset fields from management side | `BatchEditClientAssets` exists and `/manage` can batch update provider/currency/role/ignored/auto-renew, but a full core admin edit form is not yet confirmed. |
| D02 | REVIEW | P0 | `komari` | Asset field completeness validation | Validation exists in `database/clients/client.go`, and metadata gaps are surfaced by asset summary/issues/workbench, but the full edit-page feedback loop is still partial. |
| D03 | REVIEW | P1 | `komari` | Asset governance panel | Theme `/manage` already provides summary, queues, filters, and inventory, but the core server-side admin experience is not fully consolidated. |
| D04 | REVIEW | P1 | `komari` | Ops assurance panel | Token lifecycle APIs exist (`GetClientToken`, `RotateClientToken`, `ReissueClientToken`, `RevokeClientToken`), but a unified panel for tokens, notifications, task results, and agent drift is not present. |
| D05 | REVIEW | P1 | `komari` | Risk / asset linked filtering | High-risk, metadata-gap, underused, and related filters exist through `/manage` and asset inventory APIs; capability-missing drill-down is still partial. |
| D06 | TODO | P2 | `komari` | Ops remarks and governance action suggestions | No dedicated manual governance notes / observe-ignore workflow exists yet. |

### E. Agent capabilities and observability completeness

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| E01 | DONE | P1 | `komari-agent` | Agent capability reporting | `server/basicInfo.go` reports `capability_ping`, `capability_terminal`, `capability_remote_exec`, `capability_remote_control`, `capability_gpu`, `capability_auto_update`, and `capability_private_ping_targets`. |
| E02 | DONE | P1 | `komari` + `komari-web-mochi` | Include capability gaps in asset risk | Backend issue reasons include capability gaps; `AssetDetailsDialog.tsx` and `/manage` consume them. |
| E03 | REVIEW | P2 | `komari-agent` + `komari` | Version and observation-quality enhancements | Version data exists and capability metadata is persisted, but dedicated version-drift and observation-quality governance is not finished. |

### F. Homepage and existing-view enhancements

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| F01 | DONE | P1 | `komari-web-mochi` | Homepage asset summary entry | `HomeAssetOverview.tsx` adds first-screen asset KPI cards plus direct `Open asset view` and `Open asset desk` entry points. |
| F02 | DONE | P1 | `komari-web-mochi` | Natural-language homepage risk summary | Homepage hero now renders sentence-style portfolio summaries such as renewals, manual-renew exposure, offline nodes, and network pressure. |
| F03 | TODO | P2 | `komari-web-mochi` | Enrich existing detail page with asset info | The classic instance detail views still do not expose the same asset metadata depth as `AssetDetailsDialog.tsx`. |

### G. Regression, validation, and release readiness

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| G01 | REVIEW | P0 | all | Validate calculation rules | There is reusable metrics code and some server-side tests, but no finished cross-cycle parity matrix proving FE/BE formulas end to end. |
| G02 | REVIEW | P1 | all | Desktop / mobile regression | Asset workbench was browser-verified and theme builds pass, but no full homepage/asset/mobile regression matrix is recorded yet. |
| G03 | REVIEW | P1 | all | Legacy-data compatibility and fallback | Null-array normalization and field defaults exist, but full old-data compatibility coverage across all new views is still incomplete. |
| G04 | TODO | P2 | all | Documentation and release checklist | Release docs, field docs, and rollback checklist are still missing. |

## 5. Current totals

| Status | Count |
| --- | ---: |
| DONE | 24 |
| REVIEW | 12 |
| TODO | 5 |
| DOING | 0 |
| BLOCKED | 0 |

## 6. Immediate next batches

Recommended next implementation order based on current gaps:

1. Asset detail and risk closure
   - `A06`
   - `A09`
   - `A13`
2. Server and governance closure
   - `C04`
   - `D01`
   - `D02`
   - `D03`
   - `D04`
   - `D06`
3. Existing detail and release-readiness closure
   - `F03`
   - `G01`
   - `G02`
   - `G03`
   - `G04`

## 7. Update rule for this file

Whenever a board item is advanced:

1. Update the status in this file.
2. Add or refresh the audit note with the exact evidence file or API.
3. Re-run the relevant verification:
   - build
   - lint
   - tests
   - browser verification when UI changed
4. Only move `REVIEW` to `DONE` after acceptance evidence is explicit.
