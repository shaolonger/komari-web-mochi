import Footer from "@/components/Footer";
import Loading from "@/components/loading";
import LoginDialog from "@/components/Login";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import {
  type AssetBatchEditChanges,
  type AssetInventoryFilterMode,
  type AssetInventoryFilters,
  type AssetInventoryItem,
  type AssetInventoryResponse,
  type AssetInventorySortMode,
  type AssetInventorySortOrder,
  type AssetIssueItem,
  type AssetIssuesResponse,
  type AssetPortfolioSummary,
  batchEditAssets,
  getAssetInventory,
  getAssetIssues,
  getAssetSummary,
} from "@/lib/assetAdminApi";
import {
  getBillingCycleLabel,
} from "@/utils/assetMetrics";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  HardDriveDownload,
  Layers3,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ManageFilterState = {
  provider: string;
  currency: string;
  role: string;
  includeIgnored: boolean;
  filter: AssetInventoryFilterMode;
  sort: AssetInventorySortMode;
  order: AssetInventorySortOrder;
};

type BatchEditForm = {
  provider: string;
  role: string;
  currencySymbol: string;
  currencyCode: string;
  ignoredState: "keep" | "yes" | "no";
  autoRenewal: "keep" | "yes" | "no";
};

const DEFAULT_FILTERS: ManageFilterState = {
  provider: "",
  currency: "",
  role: "",
  includeIgnored: true,
  filter: "all",
  sort: "risk",
  order: "desc",
};

const DEFAULT_BATCH_EDIT: BatchEditForm = {
  provider: "",
  role: "",
  currencySymbol: "",
  currencyCode: "",
  ignoredState: "keep",
  autoRenewal: "keep",
};

const ISSUE_REASON_LABELS: Record<string, string> = {
  offline_or_stale: "Offline or stale",
  renewal_due_7d: "Renewal due in 7 days",
  renewal_due_30d: "Renewal due in 30 days",
  manual_renewal: "Manual renewal required",
  traffic_above_90pct: "Traffic above 90%",
  traffic_above_75pct: "Traffic above 75%",
  metadata_gap: "Metadata gap",
  capability_ping_disabled: "Ping disabled",
  no_remediation_path: "No terminal or exec path",
  capability_auto_update_disabled: "Auto update disabled",
  underused_spend: "Paid but underused",
};

const FIELD_LABELS: Record<string, string> = {
  provider: "Provider",
  currency: "Currency symbol",
  currency_code: "Currency code",
  business_role: "Business role",
  billing_cycle: "Billing cycle",
  expired_at: "Expiry date",
};

const lifecycleOrder: Array<{
  key: keyof AssetPortfolioSummary["lifecycle"];
  label: string;
  tone: string;
}> = [
  { key: "renewal_7d", label: "Renew within 7d", tone: "bg-rose-500" },
  { key: "renewal_30d", label: "Renew within 30d", tone: "bg-amber-500" },
  { key: "active", label: "Active runway", tone: "bg-emerald-500" },
  { key: "long_term", label: "Long term", tone: "bg-sky-500" },
  { key: "metadata_gap", label: "Metadata gap", tone: "bg-violet-500" },
  { key: "underused", label: "Underused", tone: "bg-fuchsia-500" },
];

function humanizeReason(reason: string): string {
  return ISSUE_REASON_LABELS[reason] || reason.split("_").join(" ");
}

function humanizeField(field: string): string {
  return FIELD_LABELS[field] || field.split("_").join(" ");
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatBilling(item: AssetInventoryItem): string {
  if (item.price <= 0) {
    return "No billing";
  }
  return `${item.currency_label}${item.price.toFixed(2)} / ${getBillingCycleLabel(
    item.billing_cycle,
    ((key: string) => {
      const labels: Record<string, string> = {
        "common.monthly": "month",
        "common.quarterly": "quarter",
        "common.semi_annual": "half year",
        "common.annual": "year",
        "common.biennial": "2 years",
        "common.triennial": "3 years",
        "common.once": "once",
        "nodeCard.time_day": "days",
      };
      return labels[key] || key;
    }) as never
  )}`;
}

function formatDaysRemaining(days?: number): string {
  if (days === undefined) {
    return "No expiry";
  }
  if (days <= 0) {
    return "Expired";
  }
  if (days > 36500) {
    return "Long term";
  }
  return `${days}d`;
}

function formatPortfolioCurrencySummary(
  groups: AssetPortfolioSummary["currencies"],
  field:
    | "monthly_cost"
    | "annualized_cost"
    | "remaining_value"
    | "renewal_7d_exposure"
    | "renewal_30d_exposure"
): string {
  if (!groups.length) {
    return "0";
  }

  return groups
    .map((group) => `${group.label}${group[field].toFixed(2)}`)
    .join(" · ");
}

function buildBatchChanges(form: BatchEditForm): AssetBatchEditChanges {
  const changes: AssetBatchEditChanges = {};

  if (form.provider.trim()) {
    changes.provider = form.provider.trim();
  }
  if (form.role.trim()) {
    changes.business_role = form.role.trim();
  }
  if (form.currencySymbol.trim()) {
    changes.currency = form.currencySymbol.trim();
  }
  if (form.currencyCode.trim()) {
    changes.currency_code = form.currencyCode.trim().toUpperCase();
  }
  if (form.ignoredState !== "keep") {
    changes.asset_ignored = form.ignoredState === "yes";
  }
  if (form.autoRenewal !== "keep") {
    changes.auto_renewal = form.autoRenewal === "yes";
  }

  return changes;
}

function SectionCard({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/60 bg-white/75 p-5 shadow-[0_18px_50px_rgba(35,57,93,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-black/20",
        className
      )}
    >
      <div className="mb-4">
        {eyebrow ? (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-10)]">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-xl font-semibold text-[var(--accent-12)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ManageWorkbench() {
  const { account, loading: accountLoading } = useAccount();
  const { publicInfo } = usePublicInfo();
  const [filters, setFilters] = useLocalStorage<ManageFilterState>(
    "assetWorkbenchFilters",
    DEFAULT_FILTERS
  );
  const [summary, setSummary] = useState<AssetPortfolioSummary | null>(null);
  const [issues, setIssues] = useState<AssetIssuesResponse | null>(null);
  const [inventory, setInventory] = useState<AssetInventoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchForm, setBatchForm] = useState<BatchEditForm>(DEFAULT_BATCH_EDIT);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const loadWorkbench = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseFilters = {
        provider: filters.provider || undefined,
        currency: filters.currency || undefined,
        role: filters.role || undefined,
        includeIgnored: filters.includeIgnored,
      };
      const [summaryResponse, issuesResponse, inventoryResponse] =
        await Promise.all([
          getAssetSummary(baseFilters),
          getAssetIssues({ ...baseFilters, limit: 8 }),
          getAssetInventory({
            ...baseFilters,
            filter: filters.filter,
            sort: filters.sort,
            order: filters.order,
            limit: 200,
          } satisfies AssetInventoryFilters),
        ]);

      setSummary(summaryResponse);
      setIssues(issuesResponse);
      setInventory(inventoryResponse);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load asset workbench";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (account?.logged_in) {
      void loadWorkbench();
    }
  }, [account?.logged_in, loadWorkbench]);

  useEffect(() => {
    setSelectedIds((current) => {
      if (!inventory) {
        return current;
      }
      const availableIds = new Set(inventory.items.map((item) => item.uuid));
      return current.filter((uuid) => availableIds.has(uuid));
    });
  }, [inventory]);

  const providerOptions = useMemo(() => {
    const values = new Set<string>();
    summary?.providers.forEach((item) => values.add(item.name));
    summary?.ignored_providers.forEach((item) => values.add(item.name));
    inventory?.items.forEach((item) => values.add(item.provider));
    return Array.from(values).sort();
  }, [inventory, summary]);

  const currencyOptions = useMemo(() => {
    const values = new Set<string>();
    summary?.currencies.forEach((item) => values.add(item.key));
    inventory?.items.forEach((item) => values.add(item.currency));
    return Array.from(values).sort();
  }, [inventory, summary]);

  const roleOptions = useMemo(() => {
    const values = new Set<string>();
    inventory?.items.forEach((item) => values.add(item.role));
    return Array.from(values).sort();
  }, [inventory]);

  const filteredItems = useMemo(() => {
    if (!inventory) {
      return [];
    }

    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return inventory.items;
    }

    return inventory.items.filter((item) => {
      const haystack = [
        item.name,
        item.provider,
        item.role,
        item.group,
        item.currency,
        item.currency_label,
        ...item.risk_reasons,
        ...(item.metadata_missing_fields || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [inventory, searchQuery]);

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.uuid));

  const someVisibleSelected =
    filteredItems.some((item) => selectedIds.includes(item.uuid)) &&
    !allVisibleSelected;

  const selectedItems = useMemo(() => {
    if (!inventory) {
      return [];
    }
    const selectedSet = new Set(selectedIds);
    return inventory.items.filter((item) => selectedSet.has(item.uuid));
  }, [inventory, selectedIds]);

  const topProvider = summary?.providers[0];
  const hasBatchChanges = Object.keys(buildBatchChanges(batchForm)).length > 0;

  const focusFilter = (filter: AssetInventoryFilterMode) => {
    setFilters((current) => ({ ...current, filter }));
    document.getElementById("asset-inventory")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleBatchApply = async () => {
    if (!selectedIds.length) {
      toast.error("Select at least one asset first.");
      return;
    }
    const changes = buildBatchChanges(batchForm);
    if (Object.keys(changes).length === 0) {
      toast.error("Choose at least one field to batch edit.");
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const result = await batchEditAssets(selectedIds, changes);
      toast.success(`Updated ${result.updated} asset${result.updated === 1 ? "" : "s"}.`);
      setBatchForm(DEFAULT_BATCH_EDIT);
      await loadWorkbench();
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Batch edit failed."
      );
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  if (accountLoading) {
    return <Loading />;
  }

  return (
    <div className="layout flex min-h-screen w-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(110,232,183,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.94),rgba(241,245,249,0.98))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_26%),linear-gradient(180deg,rgba(10,13,18,0.98),rgba(8,10,14,1))]">
      <NavBar />
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pb-10 pt-3 md:px-6">
        {!account?.logged_in ? (
          <SectionCard title="Asset Workbench" eyebrow="Admin Access">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-4">
                <p className="max-w-2xl text-sm leading-7 text-[var(--accent-11)]">
                  This workspace turns Komari into an asset operations console:
                  renewal attention, metadata debt, underused spend, and bulk
                  maintenance all live in one place.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <QuickHint
                    title="Renewal queues"
                    text="See the next 7-day and 30-day renewal pressure before it becomes a fire drill."
                  />
                  <QuickHint
                    title="Metadata cleanup"
                    text="Spot the assets still missing provider, currency, role, or expiry context."
                  />
                  <QuickHint
                    title="Batch maintenance"
                    text="Apply provider, currency, role, or ignore-state changes to many nodes at once."
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-[var(--accent-6)] bg-[var(--accent-2)]/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-[var(--accent-12)]">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="font-medium">Administrator login required</span>
                </div>
                <p className="mb-4 text-sm text-[var(--accent-11)]">
                  Log in with the same administrator session you use for Komari.
                  After login, this page will stay inside the theme and call the
                  admin asset APIs directly.
                </p>
                <div className="flex flex-wrap gap-3">
                  <LoginDialog showSettings={false} onLoginSuccess={() => window.location.reload()} />
                  <a href="/admin">
                    <Button variant="outline">
                      Open legacy admin
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Asset Workbench" eyebrow={publicInfo?.sitename || "Komari"}>
              <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Asset operations
                    </span>
                    <span className="rounded-full bg-[var(--accent-3)] px-3 py-1 text-xs text-[var(--accent-11)]">
                      {summary?.total_assets ?? 0} assets in scope
                    </span>
                    <span className="rounded-full bg-[var(--accent-3)] px-3 py-1 text-xs text-[var(--accent-11)]">
                      {issues?.counts.high_risk ?? 0} high-risk right now
                    </span>
                  </div>
                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-[var(--accent-12)] md:text-[2.5rem]">
                      Run renewals, portfolio hygiene, and low-efficiency cleanup from one desk.
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-[var(--accent-11)]">
                      This page stitches together the agent-reported capability
                      metadata and the admin asset APIs we just added. Use it to
                      decide what to renew, what to fix, and what to retire.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void loadWorkbench()} disabled={loading}>
                      <RefreshCw
                        className={cn("h-4 w-4", loading ? "animate-spin" : "")}
                      />
                      Refresh portfolio
                    </Button>
                    <a href="/admin">
                      <Button variant="outline">
                        Open legacy admin
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      onClick={() => window.location.assign("/")}
                    >
                      Back to monitor
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <HeroStat
                    title="Recurring spend"
                    value={
                      summary
                        ? formatPortfolioCurrencySummary(
                            summary.currencies,
                            "monthly_cost"
                          )
                        : "..."
                    }
                    hint="Per-currency monthly cost"
                  />
                  <HeroStat
                    title="Remaining value"
                    value={
                      summary
                        ? formatPortfolioCurrencySummary(
                            summary.currencies,
                            "remaining_value"
                          )
                        : "..."
                    }
                    hint="Unconsumed paid runway"
                  />
                  <HeroStat
                    title="Renewal pressure"
                    value={String(issues?.counts.renewal_attention ?? 0)}
                    hint="Assets needing renewal attention in 7 days"
                  />
                  <HeroStat
                    title="Top provider"
                    value={topProvider?.name || "—"}
                    hint={
                      topProvider
                        ? `${topProvider.asset_count} assets · ${topProvider.billable_assets} billable`
                        : "No provider data yet"
                    }
                  />
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <SectionCard title="Portfolio Overview" eyebrow="Summary">
                {summary ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        title="Assets in scope"
                        value={String(summary.total_assets)}
                        subtitle={`${summary.billable_assets} billable · ${summary.ignored_assets} ignored`}
                      />
                      <MetricCard
                        title="Recurring mix"
                        value={formatPortfolioCurrencySummary(
                          summary.currencies,
                          "annualized_cost"
                        )}
                        subtitle="Annualized by currency"
                      />
                      <MetricCard
                        title="Renewal exposure"
                        value={formatPortfolioCurrencySummary(
                          summary.currencies,
                          "renewal_30d_exposure"
                        )}
                        subtitle="30-day cash pressure"
                      />
                      <MetricCard
                        title="Risk queues"
                        value={String(summary.high_risk_assets)}
                        subtitle={`${summary.queue.metadata_gap} metadata · ${summary.queue.underused} underused`}
                      />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/80 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--accent-12)]">
                          <Layers3 className="h-4 w-4" />
                          Lifecycle buckets
                        </div>
                        <div className="space-y-3">
                          {lifecycleOrder.map((item) => {
                            const value = summary.lifecycle[item.key];
                            const width =
                              summary.total_assets > 0
                                ? `${(value / summary.total_assets) * 100}%`
                                : "0%";

                            return (
                              <div key={item.key}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="text-[var(--accent-11)]">
                                    {item.label}
                                  </span>
                                  <span className="font-medium text-[var(--accent-12)]">
                                    {value}
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--accent-4)]">
                                  <div
                                    className={cn("h-2 rounded-full", item.tone)}
                                    style={{ width }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/80 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--accent-12)]">
                          <HardDriveDownload className="h-4 w-4" />
                          Provider value concentration
                        </div>
                        <div className="space-y-3">
                          {summary.providers.slice(0, 5).map((provider) => (
                            <div key={provider.name} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-[var(--accent-12)]">
                                  {provider.name}
                                </span>
                                <span className="text-[var(--accent-11)]">
                                  {provider.asset_count} assets
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-[var(--accent-4)]">
                                <div
                                  className="h-2 rounded-full bg-[linear-gradient(90deg,#10b981,#3b82f6)]"
                                  style={{
                                    width: `${
                                      summary.remaining_value > 0
                                        ? (provider.remaining_value /
                                            summary.remaining_value) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs text-[var(--accent-11)]">
                                <span>
                                  {provider.high_risk_assets} risky ·{" "}
                                  {provider.underused_assets} underused
                                </span>
                                <span>
                                  {provider.monthly_cost > 0
                                    ? `${provider.monthly_cost.toFixed(2)} / mo`
                                    : "No recurring cost"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState text={loading ? "Loading summary..." : "Summary unavailable."} />
                )}
              </SectionCard>

              <SectionCard title="Filters & Batch Edit" eyebrow="Operator Controls">
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FilterField
                      label="Provider"
                      value={filters.provider}
                      onChange={(value) =>
                        setFilters((current) => ({ ...current, provider: value }))
                      }
                      options={providerOptions}
                    />
                    <FilterField
                      label="Currency"
                      value={filters.currency}
                      onChange={(value) =>
                        setFilters((current) => ({ ...current, currency: value }))
                      }
                      options={currencyOptions}
                    />
                    <FilterField
                      label="Role"
                      value={filters.role}
                      onChange={(value) =>
                        setFilters((current) => ({ ...current, role: value }))
                      }
                      options={roleOptions}
                    />
                    <FilterField
                      label="Inventory mode"
                      value={filters.filter}
                      onChange={(value) =>
                        setFilters((current) => ({
                          ...current,
                          filter: value as AssetInventoryFilterMode,
                        }))
                      }
                      options={[
                        "all",
                        "high",
                        "expiring",
                        "manual",
                        "ignored",
                        "metadata",
                        "underused",
                      ]}
                    />
                    <FilterField
                      label="Sort by"
                      value={filters.sort}
                      onChange={(value) =>
                        setFilters((current) => ({
                          ...current,
                          sort: value as AssetInventorySortMode,
                        }))
                      }
                      options={[
                        "risk",
                        "monthly",
                        "remaining",
                        "expiry",
                        "efficiency",
                        "name",
                      ]}
                    />
                    <FilterField
                      label="Order"
                      value={filters.order}
                      onChange={(value) =>
                        setFilters((current) => ({
                          ...current,
                          order: value as AssetInventorySortOrder,
                        }))
                      }
                      options={["desc", "asc"]}
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/70 px-4 py-3 text-sm text-[var(--accent-11)]">
                    <Checkbox
                      checked={filters.includeIgnored}
                      onCheckedChange={(checked) =>
                        setFilters((current) => ({
                          ...current,
                          includeIgnored: checked === true,
                        }))
                      }
                    />
                    Include ignored assets in queues and tables
                  </label>

                  <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/70 p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--accent-12)]">
                      <Wrench className="h-4 w-4" />
                      Batch asset maintenance
                    </div>
                    <div className="mb-3 text-sm text-[var(--accent-11)]">
                      {selectedIds.length > 0
                        ? `${selectedIds.length} asset${selectedIds.length === 1 ? "" : "s"} selected`
                        : "Select assets from the inventory table below to enable batch edit."}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <LabeledInput
                        label="Provider"
                        value={batchForm.provider}
                        placeholder="CloudSilk"
                        onChange={(value) =>
                          setBatchForm((current) => ({ ...current, provider: value }))
                        }
                      />
                      <LabeledInput
                        label="Role"
                        value={batchForm.role}
                        placeholder="Ingress / Backup / Lab"
                        onChange={(value) =>
                          setBatchForm((current) => ({ ...current, role: value }))
                        }
                      />
                      <LabeledInput
                        label="Currency symbol"
                        value={batchForm.currencySymbol}
                        placeholder="$ / ¥ / €"
                        onChange={(value) =>
                          setBatchForm((current) => ({
                            ...current,
                            currencySymbol: value,
                          }))
                        }
                      />
                      <LabeledInput
                        label="Currency code"
                        value={batchForm.currencyCode}
                        placeholder="USD / CNY / EUR"
                        onChange={(value) =>
                          setBatchForm((current) => ({
                            ...current,
                            currencyCode: value,
                          }))
                        }
                      />
                      <FilterField
                        label="Ignored state"
                        value={batchForm.ignoredState}
                        onChange={(value) =>
                          setBatchForm((current) => ({
                            ...current,
                            ignoredState: value as BatchEditForm["ignoredState"],
                          }))
                        }
                        options={["keep", "yes", "no"]}
                      />
                      <FilterField
                        label="Auto renewal"
                        value={batchForm.autoRenewal}
                        onChange={(value) =>
                          setBatchForm((current) => ({
                            ...current,
                            autoRenewal: value as BatchEditForm["autoRenewal"],
                          }))
                        }
                        options={["keep", "yes", "no"]}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        onClick={() => void handleBatchApply()}
                        disabled={
                          isSubmittingBatch || !selectedIds.length || !hasBatchChanges
                        }
                      >
                        {isSubmittingBatch ? "Applying..." : "Apply batch changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setBatchForm(DEFAULT_BATCH_EDIT)}
                        disabled={isSubmittingBatch}
                      >
                        Reset form
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Issue Queues" eyebrow="Triage">
              {issues ? (
                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                  <IssuePanel
                    title="Renewal attention"
                    icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
                    count={issues.counts.renewal_attention}
                    helper="Assets expiring within 7 days and still needing attention."
                    items={issues.renewal_attention}
                    emptyText="No urgent renewal pressure."
                    cta={() => focusFilter("expiring")}
                    ctaLabel="Focus expiring assets"
                  />
                  <IssuePanel
                    title="Metadata gap"
                    icon={<Filter className="h-4 w-4 text-violet-500" />}
                    count={issues.counts.metadata_gap}
                    helper="Assets still missing provider, role, currency, or expiry context."
                    items={issues.metadata_gap}
                    emptyText="Metadata quality looks healthy."
                    cta={() => focusFilter("metadata")}
                    ctaLabel="Focus metadata gaps"
                  />
                  <IssuePanel
                    title="Paid but underused"
                    icon={<Sparkles className="h-4 w-4 text-fuchsia-500" />}
                    count={issues.counts.underused}
                    helper="Spend exists, but CPU / memory / traffic contribution is weak."
                    items={issues.underused}
                    emptyText="No clear underused spend right now."
                    cta={() => focusFilter("underused")}
                    ctaLabel="Focus underused assets"
                  />
                  <IssuePanel
                    title="High risk"
                    icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}
                    count={issues.counts.high_risk}
                    helper="Combined operational risk from expiry, offline state, and missing control paths."
                    items={issues.high_risk}
                    emptyText="No assets currently score as high risk."
                    cta={() => focusFilter("high")}
                    ctaLabel="Focus high risk"
                  />
                </div>
              ) : (
                <EmptyState text={loading ? "Loading issue queues..." : "Issue queue unavailable."} />
              )}
            </SectionCard>

            <SectionCard
              title="Asset Inventory"
              eyebrow="Workbench Table"
              className="scroll-mt-6"
            >
              <div id="asset-inventory" className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--accent-11)]">
                    <span>
                      {inventory?.total ?? 0} assets after API filtering
                    </span>
                    <span>
                      {filteredItems.length} visible after search
                    </span>
                    <span>
                      {selectedItems.length} selected
                    </span>
                  </div>
                  <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/70 px-3 py-2">
                    <Search className="h-4 w-4 text-[var(--accent-10)]" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search name, provider, role, group, currency, or risk reason"
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-[var(--accent-4)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : someVisibleSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                setSelectedIds((current) =>
                                  Array.from(
                                    new Set([
                                      ...current,
                                      ...filteredItems.map((item) => item.uuid),
                                    ])
                                  )
                                );
                              } else {
                                const visibleIds = new Set(
                                  filteredItems.map((item) => item.uuid)
                                );
                                setSelectedIds((current) =>
                                  current.filter((uuid) => !visibleIds.has(uuid))
                                );
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Lifecycle</TableHead>
                        <TableHead>Capabilities</TableHead>
                        <TableHead>Spend</TableHead>
                        <TableHead>Utilization</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const selected = selectedIds.includes(item.uuid);
                        return (
                          <TableRow
                            key={item.uuid}
                            data-state={selected ? "selected" : undefined}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  setSelectedIds((current) => {
                                    if (checked === true) {
                                      return Array.from(new Set([...current, item.uuid]));
                                    }
                                    return current.filter((uuid) => uuid !== item.uuid);
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className="min-w-[280px]">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-[var(--accent-12)]">
                                    {item.name}
                                  </span>
                                  {item.online ? (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                      online
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                      offline
                                    </span>
                                  )}
                                  {item.asset_ignored ? (
                                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      ignored
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-[var(--accent-11)]">
                                  {item.provider} · {item.role} · {item.group || "No group"}
                                </div>
                                <div className="text-xs text-[var(--accent-10)]">
                                  {item.uuid}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <div className="space-y-1.5 text-xs text-[var(--accent-11)]">
                                <div>{formatBilling(item)}</div>
                                <div>{formatDaysRemaining(item.days_remaining)}</div>
                                <div>
                                  Remaining: {item.currency_label}
                                  {item.remaining_value.toFixed(2)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <div className="flex flex-wrap gap-1.5">
                                <CapabilityBadge enabled={true} label={item.currency} />
                                <CapabilityBadge
                                  enabled={item.auto_renewal}
                                  label="Auto renew"
                                />
                                <CapabilityBadge
                                  enabled={item.risk_reasons.includes(
                                    "capability_ping_disabled"
                                  ) === false}
                                  label="Ping"
                                />
                                <CapabilityBadge
                                  enabled={
                                    item.risk_reasons.includes("no_remediation_path") ===
                                    false
                                  }
                                  label="Terminal / Exec"
                                />
                                <CapabilityBadge
                                  enabled={
                                    item.risk_reasons.includes(
                                      "capability_auto_update_disabled"
                                    ) === false
                                  }
                                  label="Auto update"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[160px]">
                              <div className="space-y-1 text-xs text-[var(--accent-11)]">
                                <div>
                                  Monthly: {item.currency_label}
                                  {item.monthly_cost.toFixed(2)}
                                </div>
                                <div>
                                  Annualized: {item.currency_label}
                                  {item.annualized_cost.toFixed(2)}
                                </div>
                                <div>Efficiency: {item.efficiency_score.toFixed(1)}</div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <MetricLine
                                label="CPU"
                                value={item.cpu_usage}
                                tone="from-sky-500 to-cyan-400"
                              />
                              <MetricLine
                                label="Memory"
                                value={item.memory_usage}
                                tone="from-emerald-500 to-lime-400"
                              />
                              <MetricLine
                                label="Traffic"
                                value={item.traffic_percentage}
                                tone="from-fuchsia-500 to-violet-400"
                              />
                            </TableCell>
                            <TableCell className="min-w-[260px]">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                      item.high_risk
                                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                        : item.underused
                                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    )}
                                  >
                                    Risk {item.risk_score}
                                  </span>
                                  {item.metadata_missing_fields?.length ? (
                                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                                      {item.metadata_missing_fields.length} missing fields
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.risk_reasons.slice(0, 4).map((reason) => (
                                    <span
                                      key={reason}
                                      className="rounded-full bg-[var(--accent-3)] px-2 py-1 text-[11px] text-[var(--accent-11)]"
                                    >
                                      {humanizeReason(reason)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <div className="py-6 text-center text-sm text-[var(--accent-11)]">
                              No assets matched the current filters.
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </SectionCard>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function HeroStat({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_16px_40px_rgba(35,57,93,0.08)] dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-10)]">
        {title}
      </div>
      <div className="mt-2 text-xl font-semibold text-[var(--accent-12)]">
        {value}
      </div>
      <div className="mt-2 text-xs leading-5 text-[var(--accent-11)]">
        {hint}
      </div>
    </div>
  );
}

function QuickHint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/70 p-4">
      <div className="mb-1 text-sm font-medium text-[var(--accent-12)]">
        {title}
      </div>
      <div className="text-xs leading-6 text-[var(--accent-11)]">{text}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)]/80 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-10)]">
        {title}
      </div>
      <div className="mt-2 text-lg font-semibold text-[var(--accent-12)]">
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--accent-11)]">{subtitle}</div>
    </div>
  );
}

function IssuePanel({
  title,
  icon,
  count,
  helper,
  items,
  emptyText,
  cta,
  ctaLabel,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  helper: string;
  items: AssetIssueItem[];
  emptyText: string;
  cta: () => void;
  ctaLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--accent-4)] bg-[var(--accent-2)]/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-12)]">
            {icon}
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--accent-11)]">
            {helper}
          </p>
        </div>
        <span className="rounded-full bg-[var(--accent-4)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-12)]">
          {count}
        </span>
      </div>

      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item.uuid}`}
              className="rounded-2xl border border-[var(--accent-4)] bg-white/70 p-3 dark:bg-black/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--accent-12)]">
                    {item.name}
                  </div>
                  <div className="text-xs text-[var(--accent-11)]">
                    {item.provider} · {item.role}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--accent-11)]">
                  <div>{formatDaysRemaining(item.days_remaining)}</div>
                  <div>Risk {item.risk_score}</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(item.metadata_missing_fields || []).slice(0, 2).map((field) => (
                  <span
                    key={`${item.uuid}-${field}`}
                    className="rounded-full bg-violet-500/12 px-2 py-0.5 text-[11px] text-violet-700 dark:text-violet-300"
                  >
                    Missing {humanizeField(field)}
                  </span>
                ))}
                {item.issue_reasons.slice(0, 2).map((reason) => (
                  <span
                    key={`${item.uuid}-${reason}`}
                    className="rounded-full bg-[var(--accent-3)] px-2 py-0.5 text-[11px] text-[var(--accent-11)]"
                  >
                    {humanizeReason(reason)}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--accent-5)] px-4 py-5 text-sm text-[var(--accent-11)]">
            {emptyText}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button variant="outline" className="w-full" onClick={cta}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

function FilterField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent-10)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--accent-5)] bg-white/80 px-3 text-sm text-[var(--accent-12)] outline-none transition focus:border-[var(--accent-8)] dark:bg-black/20"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent-10)]">
        {label}
      </span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border-[var(--accent-5)] bg-white/80 dark:bg-black/20"
      />
    </label>
  );
}

function CapabilityBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[11px] font-medium",
        enabled
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          : "bg-slate-500/12 text-slate-600 dark:text-slate-300"
      )}
    >
      {label}
    </span>
  );
}

function MetricLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--accent-11)]">
        <span>{label}</span>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--accent-4)]">
        <div
          className={cn("h-2 rounded-full bg-gradient-to-r", tone)}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--accent-5)] px-4 py-8 text-center text-sm text-[var(--accent-11)]">
      {text}
    </div>
  );
}

export default function ManagePage() {
  return (
    <AccountProvider>
      <ManageWorkbench />
    </AccountProvider>
  );
}
