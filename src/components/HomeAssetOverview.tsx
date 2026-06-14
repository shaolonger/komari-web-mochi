import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Flex, Text } from "@radix-ui/themes";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Gauge,
  Globe2,
  ShieldAlert,
  Wallet,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, PingStat, Record as LiveNodeData } from "@/types/LiveData";
import { focusAssetView, type AssetFocusFilterMode } from "@/lib/assetNavigation";
import type { PingSummaryMap } from "@/hooks/usePingSummaryMap";
import { getTrafficStats } from "@/utils";
import {
  formatCurrencySummary,
  getAnnualizedCost,
  getDaysUntilExpiry,
  getMonthlyCost,
  getRemainingValue,
  groupAssetFinancials,
} from "@/utils/assetMetrics";

const STALE_REPORT_MINUTES = 10;
const NETWORK_LOSS_WARN = 5;
const NETWORK_LATENCY_WARN = 180;
const NETWORK_JITTER_WARN = 0.6;

type HomeAssetRow = {
  node: NodeBasicInfo;
  live?: LiveNodeData;
  online: boolean;
  stale: boolean;
  monthlyCost: number;
  annualizedCost: number;
  remainingValue: number;
  billable: boolean;
  daysRemaining: number | null;
  renewal7d: boolean;
  renewal30d: boolean;
  manualRenew: boolean;
  trafficPercentage: number;
  trafficAlert: boolean;
  trafficCritical: boolean;
  metadataGap: boolean;
  networkIssue: boolean;
  highRisk: boolean;
  worstPing: PingStat | null;
};

const KpiCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)] p-4">
    <Text size="2" color="gray">
      {label}
    </Text>
    <Text size="6" weight="bold" className="mt-1 block">
      {value}
    </Text>
    <Text size="1" color="gray" className="mt-1 block">
      {hint}
    </Text>
  </div>
);

const AlertCard = ({
  icon,
  title,
  count,
  description,
  cta,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  cta: () => void;
  tone: string;
}) => (
  <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between" gap="3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          {icon}
        </div>
        <Button size="1" variant="soft" onClick={cta}>
          Focus
        </Button>
      </Flex>
      <div>
        <Text size="3" weight="bold">
          {title}
        </Text>
        <Text size="6" weight="bold" className="mt-1 block">
          {count}
        </Text>
      </div>
      <Text size="1" color="gray">
        {description}
      </Text>
    </Flex>
  </Card>
);

const formatPingLine = (ping: PingStat | null) => {
  if (!ping) return "No recent ping summary";
  const avg = ping.avg > 0 ? `${Math.round(ping.avg)} ms` : "-";
  const loss = `${ping.loss.toFixed(1)}%`;
  const jitter = `${ping.tail.toFixed(2)}x`;
  return `${avg} avg · ${loss} loss · ${jitter} jitter`;
};

const scorePing = (ping: PingStat | null) => {
  if (!ping) return 0;
  return ping.loss * 4 + ping.tail * 3 + ping.avg / 100;
};

const getWorstPing = (pingMap?: Record<string, PingStat>) => {
  const stats = Object.values(pingMap ?? {});
  if (!stats.length) return null;
  return stats.reduce<PingStat | null>((worst, current) => {
    if (!worst) return current;
    return scorePing(current) > scorePing(worst) ? current : worst;
  }, null);
};

const HomeAssetOverview: React.FC<{
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  pingSummaryMap?: PingSummaryMap;
}> = ({ nodes, liveData, pingSummaryMap = {} }) => {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(() => new Date().getTime());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(new Date().getTime());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo<HomeAssetRow[]>(() => {
    const onlineSet = new Set(liveData.online || []);

    return nodes.map((node) => {
      const live = liveData.data?.[node.uuid];
      const online = onlineSet.has(node.uuid);
      const monthlyCost = getMonthlyCost(node.price, node.billing_cycle);
      const annualizedCost = getAnnualizedCost(node.price, node.billing_cycle);
      const remainingValue = getRemainingValue(node);
      const daysRemaining = getDaysUntilExpiry(node.expired_at);
      const billable = node.price > 0 && !node.asset_ignored;
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
      const trafficStats = getTrafficStats(
        live?.network?.totalUp ?? 0,
        live?.network?.totalDown ?? 0,
        node.traffic_limit,
        node.traffic_limit_type
      );
      const trafficCritical = trafficStats.percentage >= 90;
      const trafficAlert = trafficStats.percentage >= 75;
      const metadataGap =
        !node.provider?.trim() ||
        !node.business_role?.trim() ||
        !node.currency_code?.trim() ||
        !node.expired_at;
      const worstPing =
        getWorstPing(live?.ping) ||
        getWorstPing(
          Object.fromEntries(
            (pingSummaryMap[node.uuid] ?? []).map((task) => [
              String(task.id),
              {
                name: task.name,
                latest: task.max,
                avg: task.avg,
                tail: 0,
                loss: task.loss,
                min: task.min,
                max: task.max,
              },
            ])
          )
        );
      const networkIssue =
        Boolean(worstPing) &&
        ((worstPing?.loss ?? 0) >= NETWORK_LOSS_WARN ||
          (worstPing?.avg ?? 0) >= NETWORK_LATENCY_WARN ||
          (worstPing?.tail ?? 0) >= NETWORK_JITTER_WARN);
      const renewal7d =
        billable &&
        daysRemaining !== null &&
        daysRemaining > 0 &&
        daysRemaining <= 7;
      const renewal30d =
        billable &&
        daysRemaining !== null &&
        daysRemaining > 0 &&
        daysRemaining <= 30;
      const manualRenew = renewal30d && !node.auto_renewal;
      const highRisk =
        renewal7d ||
        trafficCritical ||
        networkIssue ||
        !online ||
        stale ||
        (metadataGap && billable);

      return {
        node,
        live,
        online,
        stale,
        monthlyCost,
        annualizedCost,
        remainingValue,
        billable,
        daysRemaining,
        renewal7d,
        renewal30d,
        manualRenew,
        trafficPercentage: trafficStats.percentage,
        trafficAlert,
        trafficCritical,
        metadataGap,
        networkIssue,
        highRisk,
        worstPing,
      };
    });
  }, [liveData.data, liveData.online, nodes, nowMs, pingSummaryMap]);

  const currencySummary = useMemo(() => groupAssetFinancials(nodes), [nodes]);
  const billableCount = rows.filter((row) => row.billable).length;
  const highRiskCount = rows.filter((row) => row.highRisk).length;
  const renewal7dCount = rows.filter((row) => row.renewal7d).length;
  const renewal30dCount = rows.filter((row) => row.renewal30d).length;
  const manualRenewCount = rows.filter((row) => row.manualRenew).length;
  const offlineCount = rows.filter((row) => !row.online).length;
  const staleCount = rows.filter((row) => row.stale).length;
  const trafficCount = rows.filter((row) => row.trafficAlert).length;
  const networkCount = rows.filter((row) => row.networkIssue).length;
  const monitoredNetworkCount = rows.filter((row) => row.worstPing).length;
  const pingCapableCount = rows.filter((row) => row.node.capability_ping).length;

  const worstNetworkRows = useMemo(
    () =>
      rows
        .filter((row) => row.worstPing)
        .sort(
          (a, b) =>
            scorePing(b.worstPing) - scorePing(a.worstPing)
        )
        .slice(0, 3),
    [rows]
  );

  const summaryParts = [
    renewal7dCount > 0
      ? t("asset.home.summaryRenew7d", {
          count: renewal7dCount,
          defaultValue:
            renewal7dCount === 1
              ? "1 asset needs renewal in the next 7 days"
              : `${renewal7dCount} assets need renewal in the next 7 days`,
        })
      : null,
    manualRenewCount > 0
      ? t("asset.home.summaryManual", {
          count: manualRenewCount,
          defaultValue:
            manualRenewCount === 1
              ? "1 asset still depends on manual renewal"
              : `${manualRenewCount} assets still depend on manual renewal`,
        })
      : null,
    networkCount > 0
      ? t("asset.home.summaryNetwork", {
          count: networkCount,
          defaultValue:
            networkCount === 1
              ? "1 node shows elevated latency, loss, or jitter"
              : `${networkCount} nodes show elevated latency, loss, or jitter`,
        })
      : null,
    trafficCount > 0
      ? t("asset.home.summaryTraffic", {
          count: trafficCount,
          defaultValue:
            trafficCount === 1
              ? "1 node is running hot on traffic usage"
              : `${trafficCount} nodes are running hot on traffic usage`,
        })
      : null,
    staleCount > 0
      ? t("asset.home.summaryStale", {
          count: staleCount,
          defaultValue:
            staleCount === 1
              ? "1 node has stale telemetry"
              : `${staleCount} nodes have stale telemetry`,
        })
      : null,
    offlineCount > 0
      ? t("asset.home.summaryOffline", {
          count: offlineCount,
          defaultValue:
            offlineCount === 1
              ? "1 node is currently offline"
              : `${offlineCount} nodes are currently offline`,
        })
      : null,
  ].filter(Boolean);

  const summaryText =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : t("asset.home.summaryHealthy", {
          defaultValue:
            "Portfolio looks healthy right now. No urgent renewal, network, or telemetry issues are standing out.",
        });

  const openFilter = (filter: AssetFocusFilterMode) => {
    focusAssetView(filter);
  };

  return (
    <section className="mx-4 mb-4 space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
          <Flex direction="column" gap="4">
            <Flex
              align={{ initial: "start", md: "center" }}
              justify="between"
              gap="4"
              direction={{ initial: "column", md: "row" }}
            >
              <div className="space-y-2">
                <Flex align="center" gap="2" wrap="wrap">
                  <Badge color="green" variant="soft">
                    {t("asset.home.badge", {
                      defaultValue: "Asset pulse",
                    })}
                  </Badge>
                  <Badge color="amber" variant="soft">
                    {highRiskCount}{" "}
                    {t("asset.home.highRiskBadge", {
                      defaultValue: "high-risk",
                    })}
                  </Badge>
                  <Badge color="blue" variant="soft">
                    {renewal30dCount}{" "}
                    {t("asset.home.renewalBadge", {
                      defaultValue: "renewals in 30d",
                    })}
                  </Badge>
                </Flex>
                <Text size="6" weight="bold" className="block">
                  {t("asset.home.title", {
                    defaultValue: "Keep cost, renewal pressure, and network quality in the same first screen.",
                  })}
                </Text>
                <Text size="2" color="gray">
                  {summaryText}
                </Text>
              </div>
              <Flex gap="2" wrap="wrap">
                <Button onClick={() => openFilter("all")}>
                  {t("asset.home.openAssetView", {
                    defaultValue: "Open asset view",
                  })}
                  <ArrowRight size={14} />
                </Button>
                <a href="/manage">
                  <Button variant="soft">
                    {t("asset.home.openDesk", {
                      defaultValue: "Open asset desk",
                    })}
                  </Button>
                </a>
              </Flex>
            </Flex>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={t("asset.totalAssets", { defaultValue: "Assets" })}
                value={String(nodes.length)}
                hint={t("asset.home.assetsHint", {
                  defaultValue: `${billableCount} billable · ${highRiskCount} high risk`,
                })}
              />
              <KpiCard
                label={t("asset.monthly", { defaultValue: "Monthly spend" })}
                value={formatCurrencySummary(currencySummary, "monthly")}
                hint={t("asset.home.monthlyHint", {
                  defaultValue: "30-day normalized cost from visible nodes.",
                })}
              />
              <KpiCard
                label={t("asset.annualized", { defaultValue: "Annualized spend" })}
                value={formatCurrencySummary(currencySummary, "annualized")}
                hint={t("asset.home.annualizedHint", {
                  defaultValue: "Monthly spend multiplied into a 12-month view.",
                })}
              />
              <KpiCard
                label={t("asset.remainingValue", {
                  defaultValue: "Remaining value",
                })}
                value={formatCurrencySummary(currencySummary, "remaining")}
                hint={t("asset.home.remainingHint", {
                  defaultValue: "Unconsumed prepaid value based on remaining time.",
                })}
              />
            </div>
          </Flex>
        </Card>

        <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
          <Flex direction="column" gap="4">
            <div>
              <Text size="4" weight="bold">
                {t("asset.home.networkTitle", {
                  defaultValue: "1h network watch",
                })}
              </Text>
              <Text size="2" color="gray" className="mt-1 block">
                {t("asset.home.networkHint", {
                  defaultValue:
                    "Frontload recent average latency, packet loss, and jitter so you can spot trouble before digging into details.",
                })}
              </Text>
            </div>

            {worstNetworkRows.length > 0 ? (
              <div className="space-y-3">
                {worstNetworkRows.map((row) => (
                  <div
                    key={row.node.uuid}
                    className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-1)] p-3"
                  >
                    <Flex align="center" justify="between" gap="3">
                      <div>
                        <Text size="3" weight="bold">
                          {row.node.name}
                        </Text>
                        <Text size="1" color="gray" className="mt-1 block">
                          {formatPingLine(row.worstPing)}
                        </Text>
                      </div>
                      <Badge color={row.networkIssue ? "red" : "green"} variant="soft">
                        {row.networkIssue
                          ? t("asset.home.networkAlert", {
                              defaultValue: "Watch",
                            })
                          : t("asset.home.networkHealthy", {
                              defaultValue: "Stable",
                            })}
                      </Badge>
                    </Flex>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--accent-5)] bg-[var(--accent-1)] p-4">
                <Text size="2" color="gray">
                  {t("asset.home.networkEmpty", {
                    defaultValue:
                      pingCapableCount > 0
                        ? "Ping-capable nodes are present, but no recent 1h summary is available yet."
                        : "No ping-capable nodes are publishing recent latency or loss data right now.",
                  })}
                </Text>
              </div>
            )}

            <Text size="1" color="gray">
              {t("asset.home.networkFooter", {
                defaultValue: `Monitoring ${monitoredNetworkCount} of ${pingCapableCount} ping-capable nodes with recent ping statistics.`,
              })}
            </Text>
          </Flex>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AlertCard
          icon={<Wifi size={18} className="text-red-600" />}
          title={t("asset.home.offlineTitle", {
            defaultValue: "Offline now",
          })}
          count={offlineCount}
          description={t("asset.home.offlineDesc", {
            defaultValue: "Nodes currently absent from the live online set.",
          })}
          cta={() => openFilter("offline")}
          tone="bg-red-100"
        />
        <AlertCard
          icon={<Clock3 size={18} className="text-amber-600" />}
          title={t("asset.home.expiringTitle", {
            defaultValue: "Renew soon",
          })}
          count={renewal7dCount}
          description={t("asset.home.expiringDesc", {
            defaultValue: "Billable assets expiring in the next 7 days.",
          })}
          cta={() => openFilter("expiring")}
          tone="bg-amber-100"
        />
        <AlertCard
          icon={<Gauge size={18} className="text-fuchsia-600" />}
          title={t("asset.home.trafficTitle", {
            defaultValue: "Traffic pressure",
          })}
          count={trafficCount}
          description={t("asset.home.trafficDesc", {
            defaultValue: "Nodes already above 75% of their traffic allowance.",
          })}
          cta={() => openFilter("traffic")}
          tone="bg-fuchsia-100"
        />
        <AlertCard
          icon={<AlertTriangle size={18} className="text-rose-600" />}
          title={t("asset.home.networkIssueTitle", {
            defaultValue: "Network quality",
          })}
          count={networkCount}
          description={t("asset.home.networkIssueDesc", {
            defaultValue:
              "Recent ping data showing elevated latency, packet loss, or jitter.",
          })}
          cta={() => openFilter("network")}
          tone="bg-rose-100"
        />
        <AlertCard
          icon={<ShieldAlert size={18} className="text-sky-600" />}
          title={t("asset.home.staleTitle", {
            defaultValue: "Stale telemetry",
          })}
          count={staleCount}
          description={t("asset.home.staleDesc", {
            defaultValue:
              "Nodes whose live report is older than the recent telemetry threshold.",
          })}
          cta={() => openFilter("stale")}
          tone="bg-sky-100"
        />
      </div>

      <Card className="border border-[var(--accent-4)] bg-[var(--accent-1)]">
        <Flex
          align={{ initial: "start", md: "center" }}
          justify="between"
          gap="4"
          direction={{ initial: "column", md: "row" }}
        >
          <div className="space-y-2">
            <Flex align="center" gap="2" wrap="wrap">
              <Badge color="blue" variant="soft">
                <Wallet size={12} />
                {billableCount}{" "}
                {t("asset.home.billable", { defaultValue: "billable" })}
              </Badge>
              <Badge color="orange" variant="soft">
                <Clock3 size={12} />
                {manualRenewCount}{" "}
                {t("asset.home.manualRenew", {
                  defaultValue: "manual renew",
                })}
              </Badge>
              <Badge color="gray" variant="soft">
                <Globe2 size={12} />
                {rows.filter((row) => row.metadataGap).length}{" "}
                {t("asset.home.metadataGap", {
                  defaultValue: "metadata gaps",
                })}
              </Badge>
            </Flex>
            <Text size="3" weight="bold">
              {t("asset.home.footerTitle", {
                defaultValue: "Homepage asset summary stays lightweight, but every card can drill you back into the full asset view.",
              })}
            </Text>
            <Text size="2" color="gray">
              {t("asset.home.footerHint", {
                defaultValue:
                  "Use the homepage to scan for priority work, then jump into the asset view or desk for sorting, filtering, and follow-up action.",
              })}
            </Text>
          </div>
          <div className="rounded-2xl border border-[var(--accent-4)] bg-[var(--accent-2)] px-4 py-3">
            <Text size="1" color="gray">
              {t("asset.home.footerExposure", {
                defaultValue: "30-day renewal exposure",
              })}
            </Text>
            <Text size="4" weight="bold" className="mt-1 block">
              {formatCurrencySummary(currencySummary, "renewal30d")}
            </Text>
          </div>
        </Flex>
      </Card>
    </section>
  );
};

export default HomeAssetOverview;
