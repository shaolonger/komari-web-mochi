export interface AssetAdminFilters {
  provider?: string;
  currency?: string;
  role?: string;
  includeIgnored?: boolean;
}

export interface AssetProviderSummary {
  name: string;
  asset_count: number;
  billable_assets: number;
  high_risk_assets: number;
  underused_assets: number;
  monthly_cost: number;
  annualized_cost: number;
  remaining_value: number;
}

export interface AssetCurrencySummary {
  key: string;
  label: string;
  asset_count: number;
  monthly_cost: number;
  annualized_cost: number;
  remaining_value: number;
  renewal_7d_exposure: number;
  renewal_30d_exposure: number;
}

export interface AssetLifecycleSummary {
  expired: number;
  renewal_7d: number;
  renewal_30d: number;
  active: number;
  long_term: number;
  manual_renew: number;
  ignored: number;
  metadata_gap: number;
  underused: number;
}

export interface AssetQueueSummary {
  renewal_attention: number;
  metadata_gap: number;
  underused: number;
  high_risk: number;
}

export interface AssetGovernanceSummary {
  server_version: string;
  target_agent_version: string;
  notification_channel_enabled: boolean;
  expire_notification_enabled: boolean;
  capability_gap_assets: number;
  version_drift_assets: number;
  observation_partial_assets: number;
  observation_stale_assets: number;
  observation_missing_assets: number;
  token_expiring_assets: number;
  token_expired_assets: number;
  token_revoked_assets: number;
  offline_notification_covered_assets: number;
  offline_notification_missing_assets: number;
  load_notification_covered_assets: number;
  load_notification_missing_assets: number;
  recent_task_failure_assets: number;
  governance_managed_assets: number;
  governance_observe_assets: number;
  governance_ignored_assets: number;
}

export interface AssetPortfolioSummary {
  generated_at: string;
  total_assets: number;
  billable_assets: number;
  ignored_assets: number;
  high_risk_assets: number;
  monthly_spend: number;
  annualized_spend: number;
  remaining_value: number;
  renewal_7d_exposure: number;
  renewal_30d_exposure: number;
  lifecycle: AssetLifecycleSummary;
  queue: AssetQueueSummary;
  providers: AssetProviderSummary[];
  ignored_providers: AssetProviderSummary[];
  currencies: AssetCurrencySummary[];
  governance: AssetGovernanceSummary;
}

export interface AssetScoreFactor {
  key: string;
  label: string;
  points: number;
  detail?: string;
}

export interface AssetIssueItem {
  uuid: string;
  name: string;
  provider: string;
  role: string;
  group: string;
  currency: string;
  currency_label: string;
  asset_ignored: boolean;
  online: boolean;
  monthly_cost: number;
  annualized_cost: number;
  remaining_value: number;
  days_remaining?: number;
  metadata_missing_fields?: string[];
  issue_reasons: string[];
  risk_score: number;
  high_risk: boolean;
  underused: boolean;
  manual_renew: boolean;
  capability_ping: boolean;
  capability_terminal: boolean;
  capability_remote_exec: boolean;
  capability_auto_update: boolean;
}

export interface AssetIssuesResponse {
  generated_at: string;
  filters: AssetAdminFilters & { limit: number };
  counts: AssetQueueSummary;
  renewal_attention: AssetIssueItem[];
  metadata_gap: AssetIssueItem[];
  underused: AssetIssueItem[];
  high_risk: AssetIssueItem[];
}

export type AssetInventoryFilterMode =
  | "all"
  | "high"
  | "expiring"
  | "manual"
  | "ignored"
  | "metadata"
  | "underused"
  | "capability"
  | "stale"
  | "version"
  | "token"
  | "observe";

export type AssetInventorySortMode =
  | "risk"
  | "monthly"
  | "remaining"
  | "value"
  | "expiry"
  | "efficiency"
  | "name";

export type AssetInventorySortOrder = "asc" | "desc";

export interface AssetInventoryFilters extends AssetAdminFilters {
  filter?: AssetInventoryFilterMode;
  sort?: AssetInventorySortMode;
  order?: AssetInventorySortOrder;
  limit?: number;
}

export interface AssetInventoryItem {
  uuid: string;
  name: string;
  provider: string;
  role: string;
  group: string;
  currency: string;
  currency_label: string;
  price: number;
  billing_cycle: number;
  auto_renewal: boolean;
  asset_ignored: boolean;
  online: boolean;
  cpu_usage: number;
  memory_usage: number;
  traffic_percentage: number;
  monthly_cost: number;
  annualized_cost: number;
  remaining_value: number;
  efficiency_score: number;
  value_score: number;
  value_score_factors?: AssetScoreFactor[];
  days_remaining?: number;
  metadata_missing_fields?: string[];
  risk_reasons: string[];
  risk_score: number;
  high_risk: boolean;
  underused: boolean;
  observation_quality: string;
  latest_report_at?: string;
  report_age_minutes?: number;
  version: string;
  version_drift: boolean;
  target_agent_version?: string;
  token_status: string;
  governance_status: string;
  governance_note?: string;
  offline_notification_enabled: boolean;
  load_notification_covered: boolean;
  recent_task_failure: boolean;
  capability_gap: boolean;
}

export interface AssetInventoryResponse {
  generated_at: string;
  filters: AssetInventoryFilters;
  total: number;
  items: AssetInventoryItem[];
}

export interface AssetBatchEditChanges {
  provider?: string;
  business_role?: string;
  currency?: string;
  currency_code?: string;
  asset_ignored?: boolean;
  auto_renewal?: boolean;
  governance_status?: string;
  governance_note?: string;
}

function buildQuery(
  filters: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.message || `Request failed with ${response.status}`,
    );
  }
  return payload.data as T;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

const DEFAULT_LIFECYCLE_SUMMARY: AssetLifecycleSummary = {
  expired: 0,
  renewal_7d: 0,
  renewal_30d: 0,
  active: 0,
  long_term: 0,
  manual_renew: 0,
  ignored: 0,
  metadata_gap: 0,
  underused: 0,
};

const DEFAULT_QUEUE_SUMMARY: AssetQueueSummary = {
  renewal_attention: 0,
  metadata_gap: 0,
  underused: 0,
  high_risk: 0,
};

const DEFAULT_GOVERNANCE_SUMMARY: AssetGovernanceSummary = {
  server_version: "",
  target_agent_version: "",
  notification_channel_enabled: false,
  expire_notification_enabled: false,
  capability_gap_assets: 0,
  version_drift_assets: 0,
  observation_partial_assets: 0,
  observation_stale_assets: 0,
  observation_missing_assets: 0,
  token_expiring_assets: 0,
  token_expired_assets: 0,
  token_revoked_assets: 0,
  offline_notification_covered_assets: 0,
  offline_notification_missing_assets: 0,
  load_notification_covered_assets: 0,
  load_notification_missing_assets: 0,
  recent_task_failure_assets: 0,
  governance_managed_assets: 0,
  governance_observe_assets: 0,
  governance_ignored_assets: 0,
};

export function normalizeAssetSummaryPayload(
  summary: AssetPortfolioSummary,
): AssetPortfolioSummary {
  return {
    ...summary,
    lifecycle: {
      ...DEFAULT_LIFECYCLE_SUMMARY,
      ...(summary.lifecycle ?? {}),
    },
    queue: {
      ...DEFAULT_QUEUE_SUMMARY,
      ...(summary.queue ?? {}),
    },
    governance: {
      ...DEFAULT_GOVERNANCE_SUMMARY,
      ...(summary.governance ?? {}),
    },
    providers: ensureArray(summary.providers),
    ignored_providers: ensureArray(summary.ignored_providers),
    currencies: ensureArray(summary.currencies),
  };
}

export function normalizeAssetIssuesPayload(
  issues: AssetIssuesResponse,
): AssetIssuesResponse {
  return {
    ...issues,
    counts: {
      ...DEFAULT_QUEUE_SUMMARY,
      ...(issues.counts ?? {}),
    },
    renewal_attention: ensureArray(issues.renewal_attention),
    metadata_gap: ensureArray(issues.metadata_gap),
    underused: ensureArray(issues.underused),
    high_risk: ensureArray(issues.high_risk),
  };
}

export function normalizeAssetInventoryPayload(
  inventory: AssetInventoryResponse,
): AssetInventoryResponse {
  return {
    ...inventory,
    filters: inventory.filters ?? {},
    items: ensureArray(inventory.items).map((item) => ({
      ...item,
      metadata_missing_fields: ensureArray(item.metadata_missing_fields),
      risk_reasons: ensureArray(item.risk_reasons),
      value_score_factors: ensureArray(item.value_score_factors),
    })),
  };
}

export async function getAssetSummary(
  filters: AssetAdminFilters,
): Promise<AssetPortfolioSummary> {
  const response = await fetch(
    `/api/admin/client/asset-summary${buildQuery({
      provider: filters.provider,
      currency: filters.currency,
      role: filters.role,
      include_ignored: filters.includeIgnored,
    })}`,
  );
  return normalizeAssetSummaryPayload(
    await readResponse<AssetPortfolioSummary>(response),
  );
}

export async function getAssetIssues(
  filters: AssetAdminFilters & { limit?: number },
): Promise<AssetIssuesResponse> {
  const response = await fetch(
    `/api/admin/client/asset-issues${buildQuery({
      provider: filters.provider,
      currency: filters.currency,
      role: filters.role,
      include_ignored: filters.includeIgnored,
      limit: filters.limit,
    })}`,
  );
  return normalizeAssetIssuesPayload(
    await readResponse<AssetIssuesResponse>(response),
  );
}

export async function getAssetInventory(
  filters: AssetInventoryFilters,
): Promise<AssetInventoryResponse> {
  const response = await fetch(
    `/api/admin/client/assets${buildQuery({
      provider: filters.provider,
      currency: filters.currency,
      role: filters.role,
      include_ignored: filters.includeIgnored,
      filter: filters.filter,
      sort: filters.sort,
      order: filters.order,
      limit: filters.limit,
    })}`,
  );
  return normalizeAssetInventoryPayload(
    await readResponse<AssetInventoryResponse>(response),
  );
}

export async function batchEditAssets(
  uuids: string[],
  changes: AssetBatchEditChanges,
): Promise<{ updated: number }> {
  const response = await fetch("/api/admin/client/batch-edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uuids, changes }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.message || `Request failed with ${response.status}`,
    );
  }

  return {
    updated: Number(payload.updated ?? 0),
  };
}
