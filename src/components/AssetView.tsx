import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  SegmentedControl,
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
  getDaysUntilExpiry,
  getMonthlyCost,
  getRemainingValue,
  groupAssetFinancials,
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

type SortMode = "risk" | "monthly" | "remaining" | "expiry" | "name";
type FilterMode = "all" | "high" | "expiring" | "manual" | "ignored";

interface AssetViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
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
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  riskReasons: string[];
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

const getProviderLabel = (node: NodeBasicInfo, fallback: string) =>
  node.provider?.trim() || node.group?.trim() || fallback;

const getRoleLabel = (node: NodeBasicInfo, fallback: string) =>
  node.business_role?.trim() || node.public_remark?.trim() || fallback;

const AssetView: React.FC<AssetViewProps> = ({ nodes, liveData }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [statsOpen, setStatsOpen] = useState(false);

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
      const cpuUsage = live?.cpu?.usage ?? 0;
      const memoryUsage =
        node.mem_total && live?.ram?.used
          ? (live.ram.used / node.mem_total) * 100
          : 0;
      const daysRemaining = getDaysUntilExpiry(node.expired_at);
      const riskReasons: string[] = [];
      let riskScore = 0;

      if (!online) {
        riskReasons.push(
          t("asset.riskOffline", { defaultValue: "Offline or stale" })
        );
        riskScore += 4;
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
      if (node.asset_ignored) {
        riskReasons.push(
          t("asset.ignoredLabel", { defaultValue: "Ignored from cost rollups" })
        );
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
        riskScore,
        riskLevel,
        riskReasons,
      };
    });
  }, [liveData.data, nodes, onlineSet, t]);

  const filteredRows = useMemo(() => {
    return assetRows.filter((row) => {
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
        case "all":
        default:
          return true;
      }
    });
  }, [assetRows, filterMode]);

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
      return {
        name: item.name,
        count: item.rows.length,
        monthlyCost: formatCurrencySummary(financials, "monthly"),
        remainingValue: formatCurrencySummary(financials, "remaining"),
        riskCount: item.riskCount,
        sortValue: item.rows.reduce((total, row) => total + row.monthlyCost, 0),
      };
    });

    items.sort((a, b) => b.sortValue - a.sortValue);

    return items.map((item) => ({
      name: item.name,
      count: item.count,
      monthlyCost: item.monthlyCost,
      remainingValue: item.remainingValue,
      riskCount: item.riskCount,
    }));
  }, [includedRows]);

  const highRiskCount = filteredRows.filter(
    (row) => row.riskLevel === "high"
  ).length;
  const billableCount = includedRows.filter((row) => row.node.price > 0).length;

  const monthlySpend = formatCurrencySummary(currencySummary, "monthly");
  const annualizedSpend = formatCurrencySummary(currencySummary, "annualized");
  const remainingValue = formatCurrencySummary(currencySummary, "remaining");
  const renewal7d = formatCurrencySummary(currencySummary, "renewal7d");
  const renewal30d = formatCurrencySummary(currencySummary, "renewal30d");

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
              <SegmentedControl.Root
                value={sortMode}
                onValueChange={(value) => setSortMode(value as SortMode)}
                size="1"
              >
                <SegmentedControl.Item value="risk">
                  {t("asset.sortRisk", { defaultValue: "Risk" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="monthly">
                  {t("asset.sortMonthly", { defaultValue: "Monthly" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="remaining">
                  {t("asset.sortRemaining", { defaultValue: "Residual" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="expiry">
                  {t("asset.sortExpiry", { defaultValue: "Expiry" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="name">
                  {t("asset.sortName", { defaultValue: "Name" })}
                </SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                {t("asset.filterBy", { defaultValue: "Filter" })}
              </Text>
              <SegmentedControl.Root
                value={filterMode}
                onValueChange={(value) => setFilterMode(value as FilterMode)}
                size="1"
              >
                <SegmentedControl.Item value="all">
                  {t("common.all", { defaultValue: "All" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="high">
                  {t("asset.filterHigh", { defaultValue: "High risk" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="expiring">
                  {t("asset.filterExpiring", { defaultValue: "Expiring" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="manual">
                  {t("asset.filterManual", { defaultValue: "Manual renew" })}
                </SegmentedControl.Item>
                <SegmentedControl.Item value="ignored">
                  {t("asset.filterIgnored", { defaultValue: "Ignored" })}
                </SegmentedControl.Item>
              </SegmentedControl.Root>
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
                  <TableRow key={row.node.uuid}>
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
        ignoredAssets={filteredRows.filter((row) => row.node.asset_ignored).length}
        billableAssets={billableCount}
        highRiskAssets={highRiskCount}
        monthlySpend={monthlySpend}
        annualizedSpend={annualizedSpend}
        remainingValue={remainingValue}
        renewal7d={renewal7d}
        renewal30d={renewal30d}
        providerBreakdown={providerSummary}
        currencyBreakdown={currencySummary.map((item) => ({
          label: item.label,
          count: item.count,
          monthly: formatCurrencyAmount(item.monthly, item.label),
          annualized: formatCurrencyAmount(item.annualized, item.label),
          remaining: formatCurrencyAmount(item.remaining, item.label),
        }))}
      />
    </div>
  );
};

export default AssetView;
