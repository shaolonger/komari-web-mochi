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
  | "underused";

export type AssetInventorySortMode =
  | "risk"
  | "monthly"
  | "remaining"
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
  days_remaining?: number;
  metadata_missing_fields?: string[];
  risk_reasons: string[];
  risk_score: number;
  high_risk: boolean;
  underused: boolean;
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
}

function buildQuery(
  filters: Record<string, string | number | boolean | undefined>
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
    throw new Error(payload?.message || `Request failed with ${response.status}`);
  }
  return payload.data as T;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSummary(
  summary: AssetPortfolioSummary
): AssetPortfolioSummary {
  return {
    ...summary,
    providers: ensureArray(summary.providers),
    ignored_providers: ensureArray(summary.ignored_providers),
    currencies: ensureArray(summary.currencies),
  };
}

function normalizeIssues(issues: AssetIssuesResponse): AssetIssuesResponse {
  return {
    ...issues,
    renewal_attention: ensureArray(issues.renewal_attention),
    metadata_gap: ensureArray(issues.metadata_gap),
    underused: ensureArray(issues.underused),
    high_risk: ensureArray(issues.high_risk),
  };
}

function normalizeInventory(
  inventory: AssetInventoryResponse
): AssetInventoryResponse {
  return {
    ...inventory,
    items: ensureArray(inventory.items).map((item) => ({
      ...item,
      metadata_missing_fields: ensureArray(item.metadata_missing_fields),
      risk_reasons: ensureArray(item.risk_reasons),
    })),
  };
}

export async function getAssetSummary(
  filters: AssetAdminFilters
): Promise<AssetPortfolioSummary> {
  const response = await fetch(
    `/api/admin/client/asset-summary${buildQuery({
      provider: filters.provider,
      currency: filters.currency,
      role: filters.role,
      include_ignored: filters.includeIgnored,
    })}`
  );
  return normalizeSummary(await readResponse<AssetPortfolioSummary>(response));
}

export async function getAssetIssues(
  filters: AssetAdminFilters & { limit?: number }
): Promise<AssetIssuesResponse> {
  const response = await fetch(
    `/api/admin/client/asset-issues${buildQuery({
      provider: filters.provider,
      currency: filters.currency,
      role: filters.role,
      include_ignored: filters.includeIgnored,
      limit: filters.limit,
    })}`
  );
  return normalizeIssues(await readResponse<AssetIssuesResponse>(response));
}

export async function getAssetInventory(
  filters: AssetInventoryFilters
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
    })}`
  );
  return normalizeInventory(await readResponse<AssetInventoryResponse>(response));
}

export async function batchEditAssets(
  uuids: string[],
  changes: AssetBatchEditChanges
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
    throw new Error(payload?.message || `Request failed with ${response.status}`);
  }

  return {
    updated: Number(payload.updated ?? 0),
  };
}
