import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Text,
} from "@radix-ui/themes";
import {
  BarChart3,
  Clock3,
  ShieldAlert,
  Server,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record as LiveNodeData } from "@/types/LiveData";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatBytes,
  getTrafficStats,
} from "@/utils";
import {
  formatCurrencyAmount,
  formatCurrencySummary,
  getAnnualizedCost,
  getAssetExpiryInfo,
  getCurrencyKey,
  getDaysUntilExpiry,
  getMonthlyCost,
  getRemainingValue,
  groupAssetFinancials,
  summarizeConvertedField,
} from "@/utils/assetMetrics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import AssetStatsModal from "./AssetStatsModal";
import AssetDetailsDialog from "./AssetDetailsDialog";
import {
  ASSET_FILTER_FOCUS_EVENT,
  isAssetFocusFilterMode,
  takeRequestedAssetFilter,
  type AssetFocusFilterMode,
} from "@/lib/assetNavigation";
import type { PingSummaryMap } from "@/hooks/usePingSummaryMap";

type SortMode =
  | "risk"
  | "monthly"
  | "remaining"
  | "expiry"
  | "efficiency"
  | "name";
type FilterMode = AssetFocusFilterMode;
type ProviderSortMode = "monthly" | "remaining" | "risk" | "count";
const STALE_REPORT_MINUTES = 10;
const NETWORK_LOSS_WARN = 5;
const NETWORK_LATENCY_WARN = 180;
const NETWORK_JITTER_WARN = 0.6;

interface AssetViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  pingSummaryMap?: PingSummaryMap;
}

interface AssetRow {
  node: NodeBasicInfo;
  live?: LiveNodeData;
  online: boolean;
  providerLabel: string;
  roleLabel: string;
  monthlyCost: number;
  annualizedCost: number;
  remainingValue: number;
  daysRemaining: number | null;
  trafficUsage: number;
  trafficPercentage: number;
  cpuUsage: number;
  memoryUsage: number;
  stale: boolean;
  avgLatency: number | null;
  packetLoss: number | null;
  jitterRatio: number | null;
  networkIssue: boolean;
  efficiencyScore: number;
  underused: boolean;
  metadataMissingFields: string[];
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  riskReasons: string[];
}

interface AssetStatsSettings {
  baseCurrency: string;
  providerSortMode: ProviderSortMode;
  rateUpdatedAt: string;
  rates: Record<string, string>;
}

const KpiCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) => (
  <Card className="h-full border border-[var(--accent-4)] bg-[var(--accent-2)]">
    <Flex direction="column" gap="2">
      <Flex align="center" gap="2">
        <div className="rounded-full bg-[var(--accent-4)] p-2 text-[var(--accent-11)]">
          {icon}
        </div>
        <Text size="2" color="gray">
          {label}
        </Text>
      </Flex>
      <Text size="5" weight="bold">
        {value}
      </Text>
      <Text size="1" color="gray">
        {hint}
      </Text>
    </Flex>
  </Card>
);

const ActionQueueCard = ({
  label,
  count,
  hint,
  preview,
  actionLabel,
  onAction,
}: {
  label: string;
  count: number;
  hint: string;
  preview: string[];
  actionLabel: string;
  onAction: () => void;
}) => (
  <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            {label}
          </Text>
          <Text size="5" weight="bold">
            {count}
          </Text>
        </Flex>
        <Button size="1" variant="soft" onClick={onAction}>
          {actionLabel}
        </Button>
      </Flex>
      <Text size="1" color="gray">
        {hint}
      </Text>
      <Flex gap="2" wrap="wrap">
        {preview.length === 0 ? (
          <Badge color="green" variant="soft">
            Healthy
          </Badge>
        ) : (
          preview.map((item) => (
            <Badge key={item} color="gray" variant="soft">
              {item}
            </Badge>
          ))
        )}
      </Flex>
    </Flex>
  </Card>
);

const getProviderLabel = (node: NodeBasicInfo, fallback: string) =>
  node.provider?.trim() || node.group?.trim() || fallback;

const getRoleLabel = (node: NodeBasicInfo, fallback: string) =>
  node.business_role?.trim() || node.public_remark?.trim() || fallback;

const todayDateString = () => new Date().toISOString().slice(0, 10);

const AssetView: React.FC<AssetViewProps> = ({
  nodes,
  liveData,
  pingSummaryMap = {},
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [nowMs, setNowMs] = useState(() => new Date().getTime());
  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [filterMode, setFilterMode] = useState<FilterMode>(
    () => takeRequestedAssetFilter() ?? "all"
  );
  const [providerFilter, setProviderFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedAssetUuid, setSelectedAssetUuid] = useState<string | null>(null);
  const [statsSettings, setStatsSettings] = useLocalStorage<AssetStatsSettings>(
    "assetStatsSettings",
    {
      baseCurrency: "USD",
      providerSortMode: "monthly",
      rateUpdatedAt: "",
      rates: {
        USD: "1",
      },
    }
  );

  useEffect(() => {
    const handleRequestedFilter = (event: Event) => {
      const detail = (event as CustomEvent<{ filter?: string }>).detail;
      if (detail?.filter && isAssetFocusFilterMode(detail.filter)) {
        setFilterMode(detail.filter);
      }
    };

    window.addEventListener(
      ASSET_FILTER_FOCUS_EVENT,
      handleRequestedFilter as EventListener
    );

    return () => {
      window.removeEventListener(
        ASSET_FILTER_FOCUS_EVENT,
        handleRequestedFilter as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(new Date().getTime());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const onlineSet = useMemo(
    () => new Set(liveData.online || []),
    [liveData.online]
  );

  const assetRows = useMemo<AssetRow[]>(() => {
    return nodes.map((node) => {
      const live = liveData.data?.[node.uuid];
      const online = onlineSet.has(node.uuid);
      const trafficStats = getTrafficStats(
        live?.network?.totalUp ?? 0,
        live?.network?.totalDown ?? 0,
        node.traffic_limit,
        node.traffic_limit_type
      );
      const pingStats = Object.values(live?.ping ?? {});
      const fallbackPingStats =
        pingStats.length > 0
          ? pingStats
          : (pingSummaryMap[node.uuid] ?? []).map((task) => ({
              name: task.name,
              latest: task.max,
              avg: task.avg,
              tail: 0,
              loss: task.loss,
              min: task.min,
              max: task.max,
            }));
      const cpuUsage = live?.cpu?.usage ?? 0;
      const memoryUsage =
        node.mem_total && live?.ram?.used
          ? (live.ram.used / node.mem_total) * 100
          : 0;
      const daysRemaining = getDaysUntilExpiry(node.expired_at);
      const updatedAt =
        typeof live?.updated_at === "string"
          ? new Date(live.updated_at)
          : null;
      const stale =
        Boolean(live) &&
        (!updatedAt ||
          Number.isNaN(updatedAt.getTime()) ||
          nowMs - updatedAt.getTime() >
            STALE_REPORT_MINUTES * 60 * 1000);
      const worstPing = fallbackPingStats.reduce((worst, current) => {
        if (!worst) return current;
        const currentScore =
          current.loss * 4 + current.tail * 3 + current.avg / 100;
        const worstScore =
          worst.loss * 4 + worst.tail * 3 + worst.avg / 100;
        return currentScore > worstScore ? current : worst;
      }, pingStats[0]);
      const avgLatency =
        worstPing && Number.isFinite(worstPing.avg) && worstPing.avg > 0
          ? worstPing.avg
          : null;
      const packetLoss =
        worstPing && Number.isFinite(worstPing.loss) ? worstPing.loss : null;
      const jitterRatio =
        worstPing && Number.isFinite(worstPing.tail) ? worstPing.tail : null;
      const networkIssue =
        (packetLoss !== null && packetLoss >= NETWORK_LOSS_WARN) ||
        (avgLatency !== null && avgLatency >= NETWORK_LATENCY_WARN) ||
        (jitterRatio !== null && jitterRatio >= NETWORK_JITTER_WARN);
      const metadataMissingFields: string[] = [];
      const riskReasons: string[] = [];
      let riskScore = 0;

      if (!node.provider?.trim()) {
        metadataMissingFields.push(
          t("asset.provider", { defaultValue: "Provider" })
        );
      }
      if (!node.business_role?.trim()) {
        metadataMissingFields.push(
          t("asset.role", { defaultValue: "Role" })
        );
      }
      if (!node.currency_code?.trim()) {
        metadataMissingFields.push(
          t("asset.currencyCode", { defaultValue: "Currency code" })
        );
      }
      if (!node.expired_at) {
        metadataMissingFields.push(
          t("asset.expiry", { defaultValue: "Expiry date" })
        );
      }

      if (!online) {
        riskReasons.push(
          t("asset.riskOffline", { defaultValue: "Offline or stale" })
        );
        riskScore += 4;
      }
      if (stale) {
        riskReasons.push(
          t("asset.riskDataStale", {
            defaultValue: "Telemetry is stale and should be refreshed",
          })
        );
        riskScore += 2;
      }
      if (daysRemaining !== null && daysRemaining <= 7) {
        riskReasons.push(
          t("asset.riskRenew7d", {
            defaultValue: "Renewal required within 7 days",
          })
        );
        riskScore += 4;
      } else if (daysRemaining !== null && daysRemaining <= 30) {
        riskReasons.push(
          t("asset.riskRenew30d", {
            defaultValue: "Renewal required within 30 days",
          })
        );
        riskScore += 2;
      }
      if (
        daysRemaining !== null &&
        daysRemaining <= 30 &&
        !node.auto_renewal &&
        node.price > 0
      ) {
        riskReasons.push(
          t("asset.riskManualRenew", {
            defaultValue: "Manual renewal only",
          })
        );
        riskScore += 3;
      }
      if (trafficStats.percentage >= 90) {
        riskReasons.push(
          t("asset.riskTraffic", {
            defaultValue: "Traffic usage above 90%",
          })
        );
        riskScore += 3;
      } else if (trafficStats.percentage >= 75) {
        riskReasons.push(
          t("asset.riskTrafficWatch", {
            defaultValue: "Traffic usage above 75%",
          })
        );
        riskScore += 1;
      }
      if (networkIssue) {
        riskReasons.push(
          t("asset.riskNetworkQuality", {
            defaultValue: "Recent ping quality shows elevated latency, loss, or jitter",
          })
        );
        riskScore += 2;
      }
      if (node.asset_ignored) {
        riskReasons.push(
          t("asset.ignoredLabel", { defaultValue: "Ignored from cost rollups" })
        );
      }
      if (metadataMissingFields.length > 0) {
        riskReasons.push(
          t("asset.riskMetadataGap", {
            defaultValue: "Metadata is incomplete for this asset",
          })
        );
        riskScore += 1;
      }
      if (!node.capability_ping) {
        riskReasons.push(
          t("asset.riskNoPing", {
            defaultValue: "No ping capability is enabled on the agent",
          })
        );
        riskScore += 1;
      }
      if (!node.capability_terminal && !node.capability_remote_exec) {
        riskReasons.push(
          t("asset.riskNoRemediation", {
            defaultValue: "No terminal or remote-exec remediation path",
          })
        );
        riskScore += 2;
      }
      if (!node.capability_auto_update) {
        riskReasons.push(
          t("asset.riskNoAutoUpdate", {
            defaultValue: "Agent auto-update is disabled",
          })
        );
        riskScore += 1;
      }

      const utilizationSignal = Math.max(
        cpuUsage / 100,
        memoryUsage / 100,
        Math.min(trafficStats.percentage, 100) / 100
      );
      const efficiencyScore =
        getMonthlyCost(node.price, node.billing_cycle) * (1 - utilizationSignal);
      const underused =
        online &&
        node.price > 0 &&
        !node.asset_ignored &&
        daysRemaining !== null &&
        daysRemaining > 30 &&
        cpuUsage < 10 &&
        memoryUsage < 25 &&
        trafficStats.percentage < 15;

      if (underused) {
        riskReasons.push(
          t("asset.riskUnderused", {
            defaultValue: "Low utilization relative to ongoing spend",
          })
        );
        riskScore += 2;
      }

      const riskLevel =
        riskScore >= 5 ? "high" : riskScore >= 2 ? "medium" : "low";

      return {
        node,
        live,
        online,
        providerLabel: getProviderLabel(
          node,
          t("asset.unassigned", { defaultValue: "Unassigned" })
        ),
        roleLabel: getRoleLabel(
          node,
          t("asset.roleUnknown", { defaultValue: "No role label" })
        ),
        monthlyCost: getMonthlyCost(node.price, node.billing_cycle),
        annualizedCost: getAnnualizedCost(node.price, node.billing_cycle),
        remainingValue: getRemainingValue(node),
        daysRemaining,
        trafficUsage: trafficStats.usage,
        trafficPercentage: trafficStats.percentage,
        cpuUsage,
        memoryUsage,
        stale,
        avgLatency,
        packetLoss,
        jitterRatio,
        networkIssue,
        efficiencyScore,
        underused,
        metadataMissingFields,
        riskScore,
        riskLevel,
        riskReasons,
      };
    });
  }, [liveData.data, nodes, nowMs, onlineSet, pingSummaryMap, t]);

  const filteredRows = useMemo(() => {
    return assetRows.filter((row) => {
      const currencyKey = getCurrencyKey(row.node);
      if (providerFilter !== "all" && row.providerLabel !== providerFilter) {
        return false;
      }
      if (currencyFilter !== "all" && currencyKey !== currencyFilter) {
        return false;
      }
      if (roleFilter !== "all" && row.roleLabel !== roleFilter) {
        return false;
      }

      switch (filterMode) {
        case "high":
          return row.riskLevel === "high";
        case "expiring":
          return row.daysRemaining !== null && row.daysRemaining <= 30;
        case "manual":
          return (
            row.node.price > 0 &&
            !row.node.auto_renewal &&
            row.daysRemaining !== null &&
            row.daysRemaining <= 30
          );
        case "ignored":
          return Boolean(row.node.asset_ignored);
        case "metadata":
          return row.metadataMissingFields.length > 0;
        case "underused":
          return row.underused;
        case "offline":
          return !row.online;
        case "traffic":
          return row.trafficPercentage >= 75;
        case "network":
          return row.networkIssue;
        case "stale":
          return row.stale;
        case "all":
        default:
          return true;
      }
    });
  }, [assetRows, currencyFilter, filterMode, providerFilter, roleFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      switch (sortMode) {
        case "monthly":
          return b.monthlyCost - a.monthlyCost;
        case "remaining":
          return b.remainingValue - a.remainingValue;
        case "expiry": {
          const aDays = a.daysRemaining ?? Number.MAX_SAFE_INTEGER;
          const bDays = b.daysRemaining ?? Number.MAX_SAFE_INTEGER;
          return aDays - bDays;
        }
        case "efficiency":
          return b.efficiencyScore - a.efficiencyScore;
        case "name":
          return a.node.name.localeCompare(b.node.name);
        case "risk":
        default:
          if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
          return b.monthlyCost - a.monthlyCost;
      }
    });
    return rows;
  }, [filteredRows, sortMode]);

  const includedRows = useMemo(
    () => filteredRows.filter((row) => !row.node.asset_ignored),
    [filteredRows]
  );

  const currencySummary = useMemo(
    () => groupAssetFinancials(includedRows.map((row) => row.node)),
    [includedRows]
  );

  const baseCurrencyOptions = useMemo(() => {
    const options = new Map<string, { key: string; label: string }>();

    currencySummary.forEach((item) => {
      options.set(item.key, { key: item.key, label: item.label });
    });

    if (!options.has(statsSettings.baseCurrency)) {
      options.set(statsSettings.baseCurrency, {
        key: statsSettings.baseCurrency,
        label: statsSettings.baseCurrency,
      });
    }

    return Array.from(options.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }, [currencySummary, statsSettings.baseCurrency]);

  useEffect(() => {
    if (statsSettings.rates[statsSettings.baseCurrency] === "1") return;
    setStatsSettings((prev) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [prev.baseCurrency]: "1",
      },
    }));
  }, [setStatsSettings, statsSettings.baseCurrency, statsSettings.rates]);

  const numericRates = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(statsSettings.rates).map(([key, value]) => [
          key,
          Number(value),
        ])
      ),
    [statsSettings.rates]
  );

  const convertedMonthlySummary = useMemo(
    () =>
      summarizeConvertedField(
        currencySummary,
        "monthly",
        statsSettings.baseCurrency,
        numericRates
      ),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );
  const convertedAnnualizedSummary = useMemo(
    () =>
      summarizeConvertedField(
        currencySummary,
        "annualized",
        statsSettings.baseCurrency,
        numericRates
      ),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );
  const convertedRemainingSummary = useMemo(
    () =>
      summarizeConvertedField(
        currencySummary,
        "remaining",
        statsSettings.baseCurrency,
        numericRates
      ),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );
  const convertedRenewal7dSummary = useMemo(
    () =>
      summarizeConvertedField(
        currencySummary,
        "renewal7d",
        statsSettings.baseCurrency,
        numericRates
      ),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );
  const convertedRenewal30dSummary = useMemo(
    () =>
      summarizeConvertedField(
        currencySummary,
        "renewal30d",
        statsSettings.baseCurrency,
        numericRates
      ),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );

  const missingRateCurrencies = convertedMonthlySummary.missingCurrencies;
  const normalizedTotalsReady = missingRateCurrencies.length === 0;

  const providerSummary = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        rows: AssetRow[];
        riskCount: number;
      }
    >();

    includedRows.forEach((row) => {
      const current = grouped.get(row.providerLabel) ?? {
        name: row.providerLabel,
        rows: [],
        riskCount: 0,
      };
      current.rows.push(row);
      if (row.riskLevel === "high") current.riskCount += 1;
      grouped.set(row.providerLabel, current);
    });

    const items = Array.from(grouped.values()).map((item) => {
      const financials = groupAssetFinancials(item.rows.map((row) => row.node));
      const convertedMonthly = summarizeConvertedField(
        financials,
        "monthly",
        statsSettings.baseCurrency,
        numericRates
      );
      const convertedRemaining = summarizeConvertedField(
        financials,
        "remaining",
        statsSettings.baseCurrency,
        numericRates
      );
      const nativeMonthlyValue = item.rows.reduce(
        (total, row) => total + row.monthlyCost,
        0
      );
      const nativeRemainingValue = item.rows.reduce(
        (total, row) => total + row.remainingValue,
        0
      );
      const shareLabel =
        normalizedTotalsReady &&
        convertedMonthly.missingCurrencies.length === 0 &&
        convertedMonthlySummary.value > 0
          ? `${((convertedMonthly.value / convertedMonthlySummary.value) * 100).toFixed(1)}% ${t(
              "asset.providerShareSpend",
              {
                defaultValue: "of normalized monthly spend",
              }
            )}`
          : `${item.rows.length}/${includedRows.length} ${t(
              "asset.providerShareCount",
              {
                defaultValue: "visible assets",
              }
            )}`;

      return {
        name: item.name,
        count: item.rows.length,
        monthlyCost: formatCurrencySummary(financials, "monthly"),
        remainingValue: formatCurrencySummary(financials, "remaining"),
        riskCount: item.riskCount,
        convertedMonthlyCost:
          convertedMonthly.missingCurrencies.length === 0
            ? formatCurrencyAmount(
                convertedMonthly.value,
                statsSettings.baseCurrency
              )
            : null,
        convertedRemainingValue:
          convertedRemaining.missingCurrencies.length === 0
            ? formatCurrencyAmount(
                convertedRemaining.value,
                statsSettings.baseCurrency
              )
            : null,
        shareLabel,
        nativeMonthlyValue,
        nativeRemainingValue,
        convertedMonthlyValue:
          convertedMonthly.missingCurrencies.length === 0
            ? convertedMonthly.value
            : null,
        convertedRemainingValueNumeric:
          convertedRemaining.missingCurrencies.length === 0
            ? convertedRemaining.value
            : null,
      };
    });

    items.sort((a, b) => {
      switch (statsSettings.providerSortMode) {
        case "remaining":
          return (
            (b.convertedRemainingValueNumeric ?? b.nativeRemainingValue) -
            (a.convertedRemainingValueNumeric ?? a.nativeRemainingValue)
          );
        case "risk":
          return b.riskCount - a.riskCount || b.nativeMonthlyValue - a.nativeMonthlyValue;
        case "count":
          return b.count - a.count || b.nativeMonthlyValue - a.nativeMonthlyValue;
        case "monthly":
        default:
          return (
            (b.convertedMonthlyValue ?? b.nativeMonthlyValue) -
            (a.convertedMonthlyValue ?? a.nativeMonthlyValue)
          );
      }
    });

    return items.map((item) => ({
      name: item.name,
      count: item.count,
      monthlyCost: item.monthlyCost,
      remainingValue: item.remainingValue,
      convertedMonthlyCost: item.convertedMonthlyCost,
      convertedRemainingValue: item.convertedRemainingValue,
      riskCount: item.riskCount,
      shareLabel: item.shareLabel,
    }));
  }, [
    convertedMonthlySummary.value,
    includedRows,
    normalizedTotalsReady,
    numericRates,
    statsSettings.baseCurrency,
    statsSettings.providerSortMode,
    t,
  ]);

  const ignoredProviderSummary = useMemo(() => {
    const grouped = new Map<string, AssetRow[]>();

    filteredRows
      .filter((row) => row.node.asset_ignored)
      .forEach((row) => {
        const rows = grouped.get(row.providerLabel) ?? [];
        rows.push(row);
        grouped.set(row.providerLabel, rows);
      });

    return Array.from(grouped.entries())
      .map(([name, rows]) => {
        const financials = groupAssetFinancials(
          rows.map((row) => ({
            ...row.node,
            asset_ignored: false,
          }))
        );
        return {
          name,
          count: rows.length,
          monthlyCost: formatCurrencySummary(financials, "monthly"),
          remainingValue: formatCurrencySummary(financials, "remaining"),
          convertedMonthlyCost: null,
          convertedRemainingValue: null,
          riskCount: rows.filter((row) => row.riskLevel === "high").length,
          shareLabel: "",
          sortValue: rows.reduce((total, row) => total + row.monthlyCost, 0),
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue)
      .map((item) => ({
        name: item.name,
        count: item.count,
        monthlyCost: item.monthlyCost,
        remainingValue: item.remainingValue,
        convertedMonthlyCost: item.convertedMonthlyCost,
        convertedRemainingValue: item.convertedRemainingValue,
        riskCount: item.riskCount,
        shareLabel: item.shareLabel,
      }));
  }, [filteredRows]);

  const lifecycleSummary = useMemo(() => {
    return filteredRows.reduce(
      (summary, row) => {
        const daysRemaining = row.daysRemaining;

        if (row.node.asset_ignored) {
          summary.ignored += 1;
        }
        if (row.node.price > 0 && !row.node.auto_renewal) {
          summary.manualRenew += 1;
        }

        if (daysRemaining === null) {
          return summary;
        }
        if (daysRemaining <= 0) {
          summary.expired += 1;
        } else if (daysRemaining <= 7) {
          summary.renewal7d += 1;
        } else if (daysRemaining <= 30) {
          summary.renewal30d += 1;
        } else if (daysRemaining > 365) {
          summary.longTerm += 1;
        } else {
          summary.active += 1;
        }
        return summary;
      },
      {
        expired: 0,
        renewal7d: 0,
        renewal30d: 0,
        active: 0,
        longTerm: 0,
        manualRenew: 0,
        ignored: 0,
      }
    );
  }, [filteredRows]);

  const currencyBreakdown = useMemo(
    () =>
      currencySummary.map((item) => {
        const convertedMonthly = summarizeConvertedField(
          [item],
          "monthly",
          statsSettings.baseCurrency,
          numericRates
        );
        return {
          key: item.key,
          label: item.label,
          count: item.count,
          monthly: formatCurrencyAmount(item.monthly, item.label),
          annualized: formatCurrencyAmount(item.annualized, item.label),
          remaining: formatCurrencyAmount(item.remaining, item.label),
          convertedMonthly:
            convertedMonthly.missingCurrencies.length === 0
              ? formatCurrencyAmount(
                  convertedMonthly.value,
                  statsSettings.baseCurrency
                )
              : null,
        };
      }),
    [currencySummary, numericRates, statsSettings.baseCurrency]
  );

  const rateInputs = useMemo(
    () =>
      baseCurrencyOptions.map((option) => ({
        key: option.key,
        label: option.label,
        value:
          option.key === statsSettings.baseCurrency
            ? "1"
            : statsSettings.rates[option.key] ?? "",
      })),
    [baseCurrencyOptions, statsSettings.baseCurrency, statsSettings.rates]
  );

  const queueItems = useMemo(() => {
    const renewalRows = sortedRows.filter(
      (row) => !row.node.asset_ignored && row.daysRemaining !== null && row.daysRemaining <= 7
    );
    const metadataRows = sortedRows.filter(
      (row) => row.metadataMissingFields.length > 0
    );
    const underusedRows = sortedRows.filter((row) => row.underused);

    return {
      renewalRows,
      metadataRows,
      underusedRows,
    };
  }, [sortedRows]);

  const providerOptions = useMemo(
    () =>
      Array.from(new Set(assetRows.map((row) => row.providerLabel))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [assetRows]
  );
  const currencyOptions = useMemo(
    () =>
      Array.from(
        new Set(assetRows.map((row) => getCurrencyKey(row.node)))
      ).sort((a, b) => a.localeCompare(b)),
    [assetRows]
  );
  const roleOptions = useMemo(
    () =>
      Array.from(new Set(assetRows.map((row) => row.roleLabel))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [assetRows]
  );

  const highRiskCount = filteredRows.filter(
    (row) => row.riskLevel === "high"
  ).length;
  const billableCount = includedRows.filter((row) => row.node.price > 0).length;
  const ignoredAssets = filteredRows.filter((row) => row.node.asset_ignored).length;

  const monthlySpend = formatCurrencySummary(currencySummary, "monthly");
  const annualizedSpend = formatCurrencySummary(currencySummary, "annualized");
  const remainingValue = formatCurrencySummary(currencySummary, "remaining");
  const renewal7d = formatCurrencySummary(currencySummary, "renewal7d");
  const renewal30d = formatCurrencySummary(currencySummary, "renewal30d");
  const selectedRow =
    sortedRows.find((row) => row.node.uuid === selectedAssetUuid) ?? null;

  return (
    <div className="mx-4 mb-6 flex flex-col gap-4">
      <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
        <Flex
          direction={{ initial: "column", md: "row" }}
          justify="between"
          align={{ initial: "stretch", md: "center" }}
          gap="3"
        >
          <Flex direction="column" gap="1">
            <Text size="5" weight="bold">
              {t("asset.title", { defaultValue: "Asset View" })}
            </Text>
            <Text size="2" color="gray">
              {t("asset.subtitle", {
                defaultValue:
                  "Track renewal pressure, cost exposure, and operational risk from the same page.",
              })}
            </Text>
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Button variant="soft" onClick={() => setStatsOpen(true)}>
              {t("asset.stats", { defaultValue: "Statistics" })}
            </Button>
          </Flex>
        </Flex>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={<Server size={16} />}
          label={t("asset.totalAssets", { defaultValue: "Filtered assets" })}
          value={String(filteredRows.length)}
          hint={t("asset.totalAssetsHint", {
            defaultValue: `${billableCount} billable · ${highRiskCount} high risk`,
          })}
        />
        <KpiCard
          icon={<Wallet size={16} />}
          label={t("asset.monthly", { defaultValue: "Monthly spend" })}
          value={monthlySpend}
          hint={t("asset.annualizedHint", {
            defaultValue: `Annualized ${annualizedSpend}`,
          })}
        />
        <KpiCard
          icon={<BarChart3 size={16} />}
          label={t("asset.remainingValue", { defaultValue: "Remaining value" })}
          value={remainingValue}
          hint={t("asset.remainingHint", {
            defaultValue: "Residual prepaid value in the current filter scope",
          })}
        />
        <KpiCard
          icon={<Clock3 size={16} />}
          label={t("asset.renewal7d", { defaultValue: "7-day renewal exposure" })}
          value={renewal7d}
          hint={t("asset.renewal30d", {
            defaultValue: `30-day exposure ${renewal30d}`,
          })}
        />
        <KpiCard
          icon={<ShieldAlert size={16} />}
          label={t("asset.highRisk", { defaultValue: "High-risk assets" })}
          value={String(highRiskCount)}
          hint={t("asset.highRiskHint", {
            defaultValue: "Offline, expiring soon, or close to traffic limits",
          })}
        />
        <KpiCard
          icon={<BarChart3 size={16} />}
          label={t("asset.currencies", { defaultValue: "Currency buckets" })}
          value={String(currencySummary.length)}
          hint={t("asset.currencyHint", {
            defaultValue: "Native-currency totals without exchange conversion",
          })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ActionQueueCard
          label={t("asset.queueRenewals", {
            defaultValue: "Needs renewal attention",
          })}
          count={queueItems.renewalRows.length}
          hint={t("asset.queueRenewalsHint", {
            defaultValue:
              "Expiring within 7 days and usually worth reviewing first.",
          })}
          preview={queueItems.renewalRows.slice(0, 3).map((row) => row.node.name)}
          actionLabel={t("asset.queueReview", { defaultValue: "Review" })}
          onAction={() => setFilterMode("expiring")}
        />
        <ActionQueueCard
          label={t("asset.queueMetadata", {
            defaultValue: "Missing asset metadata",
          })}
          count={queueItems.metadataRows.length}
          hint={t("asset.queueMetadataHint", {
            defaultValue:
              "Provider, role, currency code, or expiry date is still missing.",
          })}
          preview={queueItems.metadataRows.slice(0, 3).map((row) => row.node.name)}
          actionLabel={t("asset.queueReview", { defaultValue: "Review" })}
          onAction={() => setFilterMode("metadata")}
        />
        <ActionQueueCard
          label={t("asset.queueUnderused", {
            defaultValue: "Paid but underused",
          })}
          count={queueItems.underusedRows.length}
          hint={t("asset.queueUnderusedHint", {
            defaultValue:
              "Online assets with ongoing spend but persistently low utilization.",
          })}
          preview={queueItems.underusedRows.slice(0, 3).map((row) => row.node.name)}
          actionLabel={t("asset.queueReview", { defaultValue: "Review" })}
          onAction={() => setFilterMode("underused")}
        />
      </div>

      <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
        <Flex
          direction={{ initial: "column", lg: "row" }}
          justify="between"
          align={{ initial: "stretch", lg: "center" }}
          gap="3"
        >
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">
              {t("asset.tableTitle", { defaultValue: "Asset Inventory" })}
            </Text>
            <Text size="2" color="gray">
              {t("asset.tableSubtitle", {
                defaultValue:
                  "Search and group filters are shared with the main page controls. Asset-specific sort and filters live here.",
              })}
            </Text>
          </Flex>
          <Flex direction={{ initial: "column", sm: "row" }} gap="3" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.sortBy", { defaultValue: "Sort by" })}
              </Text>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-9 min-w-[170px] rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
              >
                <option value="risk">
                  {t("asset.sortRisk", { defaultValue: "Risk" })}
                </option>
                <option value="monthly">
                  {t("asset.sortMonthly", { defaultValue: "Monthly" })}
                </option>
                <option value="remaining">
                  {t("asset.sortRemaining", { defaultValue: "Residual" })}
                </option>
                <option value="expiry">
                  {t("asset.sortExpiry", { defaultValue: "Expiry" })}
                </option>
                <option value="efficiency">
                  {t("asset.sortEfficiency", {
                    defaultValue: "Cost efficiency",
                  })}
                </option>
                <option value="name">
                  {t("asset.sortName", { defaultValue: "Name" })}
                </option>
              </select>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.filterBy", { defaultValue: "Filter" })}
              </Text>
              <select
                value={filterMode}
                onChange={(event) => setFilterMode(event.target.value as FilterMode)}
                className="h-9 min-w-[170px] rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
              >
                <option value="all">
                  {t("common.all", { defaultValue: "All" })}
                </option>
                <option value="high">
                  {t("asset.filterHigh", { defaultValue: "High risk" })}
                </option>
                <option value="expiring">
                  {t("asset.filterExpiring", { defaultValue: "Expiring" })}
                </option>
                <option value="manual">
                  {t("asset.filterManual", { defaultValue: "Manual renew" })}
                </option>
                <option value="ignored">
                  {t("asset.filterIgnored", { defaultValue: "Ignored" })}
                </option>
                <option value="metadata">
                  {t("asset.filterMetadata", {
                    defaultValue: "Metadata gaps",
                  })}
                </option>
                <option value="underused">
                  {t("asset.filterUnderused", {
                    defaultValue: "Underused",
                  })}
                </option>
                <option value="offline">
                  {t("asset.filterOffline", { defaultValue: "Offline" })}
                </option>
                <option value="traffic">
                  {t("asset.filterTraffic", {
                    defaultValue: "Traffic pressure",
                  })}
                </option>
                <option value="network">
                  {t("asset.filterNetwork", {
                    defaultValue: "Network quality",
                  })}
                </option>
                <option value="stale">
                  {t("asset.filterStale", {
                    defaultValue: "Stale telemetry",
                  })}
                </option>
              </select>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.provider", { defaultValue: "Provider" })}
              </Text>
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="h-9 min-w-[170px] rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
              >
                <option value="all">
                  {t("common.all", { defaultValue: "All" })}
                </option>
                {providerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.currencyCode", { defaultValue: "Currency code" })}
              </Text>
              <select
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value)}
                className="h-9 min-w-[170px] rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
              >
                <option value="all">
                  {t("common.all", { defaultValue: "All" })}
                </option>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.role", { defaultValue: "Role" })}
              </Text>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-9 min-w-[170px] rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
              >
                <option value="all">
                  {t("common.all", { defaultValue: "All" })}
                </option>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {isMobile ? (
        <div className="flex flex-col gap-3">
          {sortedRows.map((row) => {
            const expiryInfo = getAssetExpiryInfo(row.node, t);
            return (
              <Card
                key={row.node.uuid}
                className="border border-[var(--accent-4)] bg-[var(--accent-1)]"
                onClick={() => setSelectedAssetUuid(row.node.uuid)}
              >
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start" gap="3">
                    <Flex direction="column" gap="1">
                      <Text size="3" weight="bold">
                        {row.node.name}
                      </Text>
                      <Text size="2" color="gray">
                        {row.providerLabel} · {row.roleLabel}
                      </Text>
                    </Flex>
                    <Badge color={row.online ? "green" : "red"} variant="soft">
                      {row.online
                        ? t("nodeCard.online", { defaultValue: "Online" })
                        : t("nodeCard.offline", { defaultValue: "Offline" })}
                    </Badge>
                  </Flex>

                  <Flex gap="2" wrap="wrap">
                    <Badge color="iris" variant="soft">
                      {formatCurrencyAmount(
                        row.monthlyCost,
                        row.node.currency || row.node.currency_code || "?"
                      )}
                      /mo
                    </Badge>
                    {expiryInfo && (
                      <Badge color={expiryInfo.color} variant="soft">
                        {expiryInfo.text}
                      </Badge>
                    )}
                    <Badge
                      color={
                        row.riskLevel === "high"
                          ? "red"
                          : row.riskLevel === "medium"
                            ? "orange"
                            : "green"
                      }
                      variant="soft"
                    >
                      {row.riskLevel}
                    </Badge>
                    {!row.node.auto_renewal && row.node.price > 0 && (
                      <Badge color="amber" variant="soft">
                        {t("asset.manualRenew", { defaultValue: "Manual renew" })}
                      </Badge>
                    )}
                    {row.node.asset_ignored && (
                      <Badge color="gray" variant="soft">
                        {t("asset.ignoredShort", { defaultValue: "Ignored" })}
                      </Badge>
                    )}
                  </Flex>

                  <div className="grid grid-cols-2 gap-2">
                    <Card className="bg-[var(--accent-2)]">
                      <Text size="1" color="gray">
                        {t("asset.remainingValue", { defaultValue: "Remaining" })}
                      </Text>
                      <Text size="2" weight="bold">
                        {formatCurrencyAmount(
                          row.remainingValue,
                          row.node.currency || row.node.currency_code || "?"
                        )}
                      </Text>
                    </Card>
                    <Card className="bg-[var(--accent-2)]">
                      <Text size="1" color="gray">
                        {t("asset.traffic", { defaultValue: "Traffic" })}
                      </Text>
                      <Text size="2" weight="bold">
                        {row.trafficPercentage > 0
                          ? `${row.trafficPercentage.toFixed(1)}%`
                          : formatBytes(row.trafficUsage)}
                      </Text>
                    </Card>
                  </div>

                  <Flex justify="end">
                    <Button
                      size="1"
                      variant="soft"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedAssetUuid(row.node.uuid);
                      }}
                    >
                      {t("asset.viewDetails", { defaultValue: "View details" })}
                    </Button>
                  </Flex>

                  <Flex direction="column" gap="1">
                    {row.riskReasons.length === 0 ? (
                      <Text size="1" color="gray">
                        {t("asset.noRisk", {
                          defaultValue: "No active risk indicators in the current ruleset.",
                        })}
                      </Text>
                    ) : (
                      row.riskReasons.map((reason) => (
                        <Text key={`${row.node.uuid}-${reason}`} size="1" color="gray">
                          • {reason}
                        </Text>
                      ))
                    )}
                  </Flex>
                </Flex>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.server", { defaultValue: "Server" })}</TableHead>
                <TableHead>{t("common.group", { defaultValue: "Group" })}</TableHead>
                <TableHead>{t("asset.role", { defaultValue: "Role" })}</TableHead>
                <TableHead>{t("asset.monthly", { defaultValue: "Monthly" })}</TableHead>
                <TableHead>{t("asset.remainingValue", { defaultValue: "Remaining" })}</TableHead>
                <TableHead>{t("asset.expiry", { defaultValue: "Expiry" })}</TableHead>
                <TableHead>{t("asset.utilization", { defaultValue: "Utilization" })}</TableHead>
                <TableHead>{t("asset.risk", { defaultValue: "Risk" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => {
                const expiryInfo = getAssetExpiryInfo(row.node, t);
                const currencyLabel =
                  row.node.currency || row.node.currency_code || "?";
                return (
                  <TableRow
                    key={row.node.uuid}
                    className="cursor-pointer"
                    onClick={() => setSelectedAssetUuid(row.node.uuid)}
                  >
                    <TableCell>
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="bold">
                          {row.node.name}
                        </Text>
                        <Flex gap="2" wrap="wrap">
                          <Badge
                            color={row.online ? "green" : "red"}
                            variant="soft"
                          >
                            {row.online
                              ? t("nodeCard.online", { defaultValue: "Online" })
                              : t("nodeCard.offline", { defaultValue: "Offline" })}
                          </Badge>
                          {!row.node.auto_renewal && row.node.price > 0 && (
                            <Badge color="amber" variant="soft">
                              {t("asset.manualRenew", {
                                defaultValue: "Manual renew",
                              })}
                            </Badge>
                          )}
                          {row.node.asset_ignored && (
                            <Badge color="gray" variant="soft">
                              {t("asset.ignoredShort", {
                                defaultValue: "Ignored",
                              })}
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                    </TableCell>
                    <TableCell>{row.providerLabel}</TableCell>
                    <TableCell>{row.roleLabel}</TableCell>
                    <TableCell>
                      {formatCurrencyAmount(row.monthlyCost, currencyLabel)}
                    </TableCell>
                    <TableCell>
                      {formatCurrencyAmount(row.remainingValue, currencyLabel)}
                    </TableCell>
                    <TableCell>
                      <Flex direction="column" gap="1">
                        <Text size="2">
                          {expiryInfo?.text ||
                            t("asset.noExpiry", { defaultValue: "No expiry" })}
                        </Text>
                        {row.daysRemaining !== null && (
                          <Text size="1" color="gray">
                            {row.daysRemaining}d
                          </Text>
                        )}
                      </Flex>
                    </TableCell>
                    <TableCell>
                      <Flex direction="column" gap="1">
                        <Text size="2">
                          CPU {row.cpuUsage.toFixed(0)}% · RAM {row.memoryUsage.toFixed(0)}%
                        </Text>
                        <Text size="1" color="gray">
                          {row.trafficPercentage > 0
                            ? `${row.trafficPercentage.toFixed(1)}% traffic`
                            : formatBytes(row.trafficUsage)}
                        </Text>
                      </Flex>
                    </TableCell>
                    <TableCell>
                      <Flex direction="column" gap="1">
                        <Badge
                          color={
                            row.riskLevel === "high"
                              ? "red"
                              : row.riskLevel === "medium"
                                ? "orange"
                                : "green"
                          }
                          variant="soft"
                        >
                          {row.riskLevel}
                        </Badge>
                        <Flex gap="1" wrap="wrap">
                          {!row.node.capability_ping && (
                            <Badge color="gray" variant="soft">
                              {t("asset.capabilityPingShort", {
                                defaultValue: "No ping",
                              })}
                            </Badge>
                          )}
                          {row.metadataMissingFields.length > 0 && (
                            <Badge color="amber" variant="soft">
                              {t("asset.metadataShort", {
                                defaultValue: "Metadata",
                              })}
                            </Badge>
                          )}
                          {!row.node.capability_terminal &&
                            !row.node.capability_remote_exec && (
                              <Badge color="gray" variant="soft">
                                {t("asset.capabilityRemediationShort", {
                                  defaultValue: "No shell",
                                })}
                              </Badge>
                            )}
                          {row.underused && (
                            <Badge color="blue" variant="soft">
                              {t("asset.underusedShort", {
                                defaultValue: "Idle spend",
                              })}
                            </Badge>
                          )}
                        </Flex>
                        <Text size="1" color="gray">
                          {row.riskReasons[0] ||
                            t("asset.noRisk", {
                              defaultValue: "No active risk indicators",
                            })}
                        </Text>
                      </Flex>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AssetStatsModal
        open={statsOpen}
        onOpenChange={setStatsOpen}
        totalAssets={filteredRows.length}
        ignoredAssets={ignoredAssets}
        billableAssets={billableCount}
        highRiskAssets={highRiskCount}
        monthlySpend={monthlySpend}
        annualizedSpend={annualizedSpend}
        remainingValue={remainingValue}
        renewal7d={renewal7d}
        renewal30d={renewal30d}
        convertedMonthlySpend={
          normalizedTotalsReady
            ? formatCurrencyAmount(
                convertedMonthlySummary.value,
                statsSettings.baseCurrency
              )
            : null
        }
        convertedAnnualizedSpend={
          normalizedTotalsReady
            ? formatCurrencyAmount(
                convertedAnnualizedSummary.value,
                statsSettings.baseCurrency
              )
            : null
        }
        convertedRemainingValue={
          normalizedTotalsReady
            ? formatCurrencyAmount(
                convertedRemainingSummary.value,
                statsSettings.baseCurrency
              )
            : null
        }
        convertedRenewal7d={
          normalizedTotalsReady
            ? formatCurrencyAmount(
                convertedRenewal7dSummary.value,
                statsSettings.baseCurrency
              )
            : null
        }
        convertedRenewal30d={
          normalizedTotalsReady
            ? formatCurrencyAmount(
                convertedRenewal30dSummary.value,
                statsSettings.baseCurrency
              )
            : null
        }
        missingRateCurrencies={missingRateCurrencies}
        providerBreakdown={providerSummary}
        ignoredProviderBreakdown={ignoredProviderSummary}
        currencyBreakdown={currencyBreakdown}
        lifecycleSummary={lifecycleSummary}
        baseCurrency={statsSettings.baseCurrency}
        baseCurrencyOptions={baseCurrencyOptions}
        onBaseCurrencyChange={(value) =>
          setStatsSettings((prev) => ({
            ...prev,
            baseCurrency: value,
            rates: {
              ...prev.rates,
              [value]: "1",
            },
          }))
        }
        providerSortMode={statsSettings.providerSortMode}
        onProviderSortModeChange={(value) =>
          setStatsSettings((prev) => ({
            ...prev,
            providerSortMode: value as ProviderSortMode,
          }))
        }
        rateUpdatedAt={statsSettings.rateUpdatedAt}
        onRateUpdatedAtChange={(value) =>
          setStatsSettings((prev) => ({
            ...prev,
            rateUpdatedAt: value,
          }))
        }
        rateInputs={rateInputs}
        onRateChange={(currencyKey, nextValue) =>
          setStatsSettings((prev) => ({
            ...prev,
            rateUpdatedAt: prev.rateUpdatedAt || todayDateString(),
            rates: {
              ...prev.rates,
              [currencyKey]:
                currencyKey === prev.baseCurrency ? "1" : nextValue,
            },
          }))
        }
      />
      <AssetDetailsDialog
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssetUuid(null);
        }}
        node={selectedRow?.node ?? null}
        online={selectedRow?.online ?? false}
        providerLabel={selectedRow?.providerLabel ?? ""}
        roleLabel={selectedRow?.roleLabel ?? ""}
        riskLevel={selectedRow?.riskLevel ?? "low"}
        riskReasons={selectedRow?.riskReasons ?? []}
        monthlyCost={selectedRow?.monthlyCost ?? 0}
        annualizedCost={selectedRow?.annualizedCost ?? 0}
        remainingValue={selectedRow?.remainingValue ?? 0}
        daysRemaining={selectedRow?.daysRemaining ?? null}
        trafficPercentage={selectedRow?.trafficPercentage ?? 0}
        trafficUsage={selectedRow?.trafficUsage ?? 0}
        cpuUsage={selectedRow?.cpuUsage ?? 0}
        memoryUsage={selectedRow?.memoryUsage ?? 0}
      />
    </div>
  );
};

export default AssetView;
