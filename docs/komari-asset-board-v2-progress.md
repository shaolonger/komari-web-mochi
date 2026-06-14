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
  - `scripts/asset-release-audit.ts`
  - `src/components/NodeModernCardStatic.tsx`
  - `src/components/NodeCompactCard.tsx`
  - `src/components/DesktopDetailsCard.tsx`
  - `src/components/MobileDetailsCard.tsx`
  - `src/components/PriceTags.tsx`
  - `src/pages/Index.tsx`
- Server-side asset model and APIs:
  - `database/models/models.go`
  - `database/clients/client.go`
  - `database/assetfx/assetfx.go`
  - `api/admin/client_asset_evaluation.go`
  - `api/admin/client.go`
  - `api/admin/asset_fx.go`
  - `api/admin/client_asset_summary.go`
  - `api/admin/client_asset_issues.go`
  - `api/admin/client_asset_inventory.go`
  - `api/public/asset_fx.go`
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
| FX display and refresh | DONE | Server-side FX snapshot fetch/cache/refresh is now available through `database/assetfx/assetfx.go`, `api/public/asset_fx.go`, and `api/admin/asset_fx.go`; `AssetView.tsx` consumes the snapshot to prefill rates and update time. |
| Renewal exposure | DONE | 7-day and 30-day exposure exist in theme and backend summary. |
| High-risk asset identification | DONE | `risk_score`, `high_risk`, issue queues, and filters already exist. |
| Idle / underused asset identification | DONE | `src/utils/assetSignals.ts` now excludes protected assets from reclaim suggestions, `AssetView.tsx` exposes idle-spend filters/queues, and details show estimated monthly waste. |
| Asset decision labels | DONE | `src/utils/assetSignals.ts` and `AssetView.tsx` now emit and display retain / observe / renew / reclaim labels with filter support. |
| Node card asset semantics enhancement | DONE | `NodeModernCardStatic.tsx`, `NodeCompactCard.tsx`, `Node.tsx`, and `PriceTags.tsx` now surface role/remark context and explicit auto-renew or manual-renew status on cards. |
| Homepage alert strip | DONE | `HomeAssetOverview.tsx` adds homepage alert cards for offline, renew-soon, traffic, network quality, and stale telemetry, with routing into asset filters. |
| Latency / loss summary frontload | DONE | `HomeAssetOverview.tsx` adds a 1h network watch block with latency/loss/jitter summary support and a graceful empty state. |
| `public_remark` / `auto_renewal` field usage | DONE | Both are mapped in `NodeListContext.tsx`; `public_remark` is used by asset details and search. |
| Backend asset fields (`provider`, `currency_code`, `asset_ignored`, `business_role`) | DONE | Server model, validation, and APIs are already present. |
| Admin-side asset editing and completeness validation | DONE | `/manage` batch maintenance now covers provider/currency/role/ignore/auto-renew/governance fields, and metadata gaps are visible in both queues and the inventory table. |
| Asset governance panel | DONE | `/manage` now includes a dedicated `Ops Assurance` governance section plus governance-rich inventory rows. |
| Token / notification / task-result / agent-version governance | DONE | Server-side governance summary now aggregates token state, notification coverage, recent task failures, version drift, and observation quality; `/manage` consumes and displays it. |
| Agent capability reporting | DONE | Agent reports capability flags in `server/basicInfo.go`, server persists them. |
| Capability gaps included in asset risk | DONE | Backend issue reasons and frontend asset details already surface capability-related risk. |
| Asset value / risk scoring | DONE | Theme-side value/risk scoring and explanation are now exposed through `src/utils/assetSignals.ts`, `AssetView.tsx`, and `AssetDetailsDialog.tsx`. |

## 3. Milestones

| Milestone | Goal | Completion condition | Status | Notes |
| --- | --- | --- | --- | --- |
| M1 | Asset data foundation | Core asset fields can be maintained, distributed, and consumed | DONE | Asset fields, governance fields, validation, and management-side maintenance are now closed across server and theme. |
| M2 | Asset view MVP | Front-end asset view, KPI, and inventory are usable | DONE | `AssetView.tsx`, `AssetStatsModal.tsx`, and the drawer-based `AssetDetailsDialog.tsx` now satisfy the MVP asset-view loop. |
| M3 | Risk and governance loop | Renewals, risk, capability, and ops assurance all visible | DONE | Renewals, risk queues, capability gaps, token/notification/version/task governance, and observation quality are all visible now. |
| M4 | Decision support enhancement | Idle detection, decision labels, and scoring go live | DONE | Theme-side decisions are live and server-side traceable value scoring is now exposed through admin asset APIs. |
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
| A06 | DONE | P1 | `komari-web-mochi` | Renewal timeline | `AssetView.tsx` now shows today / 7-day / 30-day renewal buckets with exposure labels, previews, and clickable filtering into the inventory list. |
| A07 | DONE | P1 | `komari-web-mochi` | Risk layered filtering | `AssetView.tsx` now supports high / medium / low risk bands, one-click chips, and consistent risk explanations sourced from `src/utils/assetSignals.ts`. |
| A08 | DONE | P1 | `komari-web-mochi` | Homepage top alert summary strip | `HomeAssetOverview.tsx` now surfaces offline, renew-soon, traffic, network-quality, and stale-telemetry alerts, and verified routing into asset filters. |
| A09 | DONE | P1 | `komari-web-mochi` | Node card asset semantics enhancement | `NodeModernCardStatic.tsx`, `NodeCompactCard.tsx`, `Node.tsx`, and `PriceTags.tsx` now expose role/remark context plus auto-renew or manual-renew status without overloading the cards. |
| A10 | DONE | P1 | `komari-web-mochi` | Frontload latency / packet loss summary | Homepage now includes a `1h network watch` block that surfaces average latency, packet loss, and jitter support with ping-summary fallback and empty-state handling. |
| A11 | DONE | P1 | `komari-web-mochi` | Asset decision label system | `AssetView.tsx` and `AssetDetailsDialog.tsx` now show retain / observe / renew / reclaim labels, reasons, summaries, and filter lanes. |
| A12 | DONE | P1 | `komari-web-mochi` | Idle / underused asset view | `src/utils/assetSignals.ts` adds protected-node exclusion and waste estimation; `AssetView.tsx` surfaces reclaim candidates separately from protected low-utilization assets. |
| A13 | DONE | P2 | `komari-web-mochi` | Provider / group / currency aggregation analysis | `AssetView.tsx` now adds an aggregation workbench that switches between provider, group, and currency and respects amount / count / risk ranking. |
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
| C04 | DONE | P1 | `komari` | FX capability and update time | `database/assetfx/assetfx.go` now fetches and caches FX snapshots, `api/public/asset_fx.go` exposes them to the theme, and `api/admin/asset_fx.go` provides an explicit refresh path with stale fallback. |
| C05 | DONE | P1 | `komari` | Backend risk support | `api/admin/client_asset_issues.go` and related assessment code already output risk flags, reasons, and counts. |
| C06 | DONE | P2 | `komari` | Asset scoring output | `api/admin/client_asset_evaluation.go`, `client_asset_inventory.go`, and `client_asset_issues.go` now emit `value_score` plus factor traceability, alongside the existing risk model. |

### D. Management and governance capabilities

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| D01 | DONE | P0 | `komari` | Maintain asset fields from management side | `/manage` batch maintenance now updates provider, role, currency, ignore state, auto-renew, governance status, and governance note through `BatchEditClientAssets`. |
| D02 | DONE | P0 | `komari` | Asset field completeness validation | `database/clients/client.go` validates the expanded asset/governance fields, while `/manage` exposes metadata-gap queues and per-row missing-field badges. |
| D03 | DONE | P1 | `komari` | Asset governance panel | `/manage` now combines portfolio summary, issue queues, ops assurance, governance filters, and governance-rich inventory rows into one consolidated governance desk. |
| D04 | DONE | P1 | `komari` | Ops assurance panel | `client_asset_summary.go` now aggregates token state, notification coverage, recent task failures, version drift, and observation quality; `/manage` renders them in `Ops Assurance`. |
| D05 | DONE | P1 | `komari` | Risk / asset linked filtering | Inventory filtering now includes capability gaps, stale observation, version drift, token attention, and governance-watch lanes in addition to the existing risk filters. |
| D06 | DONE | P2 | `komari` | Ops remarks and governance action suggestions | `models.Client` and `database/clients/client.go` now support governance status/note, and `/manage` can write and display observe/ignored/resolved workflows. |

### E. Agent capabilities and observability completeness

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| E01 | DONE | P1 | `komari-agent` | Agent capability reporting | `server/basicInfo.go` reports `capability_ping`, `capability_terminal`, `capability_remote_exec`, `capability_remote_control`, `capability_gpu`, `capability_auto_update`, and `capability_private_ping_targets`. |
| E02 | DONE | P1 | `komari` + `komari-web-mochi` | Include capability gaps in asset risk | Backend issue reasons include capability gaps; `AssetDetailsDialog.tsx` and `/manage` consume them. |
| E03 | DONE | P2 | `komari-agent` + `komari` | Version and observation-quality enhancements | Agent version drift and observation quality are now computed server-side and surfaced through admin asset APIs plus the `/manage` governance workbench. |

### F. Homepage and existing-view enhancements

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| F01 | DONE | P1 | `komari-web-mochi` | Homepage asset summary entry | `HomeAssetOverview.tsx` adds first-screen asset KPI cards plus direct `Open asset view` and `Open asset desk` entry points. |
| F02 | DONE | P1 | `komari-web-mochi` | Natural-language homepage risk summary | Homepage hero now renders sentence-style portfolio summaries such as renewals, manual-renew exposure, offline nodes, and network pressure. |
| F03 | DONE | P2 | `komari-web-mochi` | Enrich existing detail page with asset info | `DesktopDetailsCard.tsx` and `MobileDetailsCard.tsx` now include an `Asset information` section with provider, role, remark, billing, remaining value, expiry, and renewal status. |

### G. Regression, validation, and release readiness

| ID | Status | Priority | Repo | Task | Audit notes |
| --- | --- | --- | --- | --- | --- |
| G01 | DONE | P0 | all | Validate calculation rules | `scripts/asset-release-audit.ts` now validates the front-end asset formulas against the same representative billing matrix used by backend asset tests, and `go test ./api/admin -run 'TestBuildClientAssetSummary|TestBuildClientAssetInventoryFiltersAndSorts|TestBuildClientAssetInventoryIncludesGovernanceAndValueSignals'` confirms the server side. |
| G02 | REVIEW | P1 | all | Desktop / mobile regression | Theme build, targeted lint, Go tests, and mocked `/manage` browser rendering all pass, but a full multi-page desktop/mobile regression matrix is still not recorded. |
| G03 | REVIEW | P1 | all | Legacy-data compatibility and fallback | Summary/inventory normalization now includes governance defaults and array fallbacks, but full old-data compatibility coverage across every new view still needs a dedicated sweep. |
| G04 | TODO | P2 | all | Documentation and release checklist | Release docs, field docs, and rollback checklist are still missing. |

## 5. Current totals

| Status | Count |
| --- | ---: |
| DONE | 38 |
| REVIEW | 2 |
| TODO | 1 |
| DOING | 0 |
| BLOCKED | 0 |

## 6. Immediate next batches

Recommended next implementation order based on current gaps:

1. Existing release-readiness closure
   - `G02`
   - `G03`
   - `G04`
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
