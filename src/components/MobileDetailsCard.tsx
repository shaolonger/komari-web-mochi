import { Dialog, Button } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { formatBytes, formatUptime } from "./Node";
import { getTrafficStats } from "@/utils";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { Record } from "@/types/LiveData";
import { useState } from "react";
import { MetricBar } from "./MetricBar";
import { TrafficLimitChart } from "./TrafficLimitChart";
import { usePingSummary } from "@/hooks/use-ping-summary";
import {
  formatCurrencyAmount,
  getAnnualizedCost,
  getAssetExpiryInfo,
  getBillingCycleLabel,
  getMonthlyCost,
  getRemainingValue,
} from "@/utils/assetMetrics";

interface MobileDetailsCardProps {
  node: NodeBasicInfo;
  liveData?: Record;
}

export const MobileDetailsCard: React.FC<MobileDetailsCardProps> = ({
  node,
  liveData,
}) => {
  const { t } = useTranslation();
  const cpuUsage = liveData?.cpu.usage ?? 0;
  const memoryUsagePercent = node.mem_total && liveData ? (liveData.ram.used / node.mem_total) * 100 : 0;
  const diskUsagePercent = node.disk_total && liveData ? (liveData.disk.used / node.disk_total) * 100 : 0;
  const swapUsagePercent = node.swap_total && liveData ? (liveData.swap.used / node.swap_total) * 100 : 0;

  // 计算流量限制相关
  const trafficStats = liveData
    ? getTrafficStats(
        liveData.network.totalUp,
        liveData.network.totalDown,
        node.traffic_limit,
        node.traffic_limit_type
      )
    : { percentage: 0, usage: 0 };
  const hasTrafficLimit = Number(node.traffic_limit) > 0 && node.traffic_limit_type;
  const pingSummary = usePingSummary(node.uuid);
  const currencyLabel = node.currency || node.currency_code || "?";
  const assetExpiryInfo = getAssetExpiryInfo(node, t);
  const monthlyCost = getMonthlyCost(node.price, node.billing_cycle);
  const annualizedCost = getAnnualizedCost(node.price, node.billing_cycle);
  const remainingValue = getRemainingValue(node);
  const assetMetaLine = [node.business_role?.trim(), node.public_remark?.trim()]
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .join(" · ");

  // 获取流量限制类型的显示文本
  const getTrafficTypeDisplay = (type?: string) => {
    switch(type) {
      case 'max': return 'MAX';
      case 'min': return 'MIN';
      case 'sum': return 'SUM';
      case 'up': return 'UP';
      case 'down': return 'DOWN';
      default: return '';
    }
  };

  const cpuDisplay = liveData ? `${cpuUsage.toFixed(1)}%` : "-";
  const memoryDisplay = liveData
    ? `${formatBytes(liveData.ram.used || 0)} / ${formatBytes(node.mem_total)}`
    : formatBytes(node.mem_total);
  const diskDisplay = liveData
    ? `${formatBytes(liveData.disk.used || 0)} / ${formatBytes(node.disk_total)}`
    : formatBytes(node.disk_total);
  const swapDisplay = liveData
    ? `${formatBytes(liveData.swap.used || 0)} / ${formatBytes(node.swap_total)}`
    : formatBytes(node.swap_total);
  const networkSpeedLines = liveData
    ? [`↑ ${formatBytes(liveData.network.up || 0)}/s`, `↓ ${formatBytes(liveData.network.down || 0)}/s`]
    : "-";
  const totalTrafficLines = liveData
    ? [`↑ ${formatBytes(liveData.network.totalUp || 0)}`, `↓ ${formatBytes(liveData.network.totalDown || 0)}`]
    : "-";

  const formatLatency = (value: number | null) =>
    value == null ? "-" : `${Math.round(value)} ms`;
  const formatLoss = (value: number | null) =>
    value == null ? "-" : `${value.toFixed(1)}%`;
  const formatLoad = (value?: number) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
  const loadLines = [
    `1m: ${formatLoad(liveData?.load?.load1)}`,
    `5m: ${formatLoad(liveData?.load?.load5)}`,
    `15m: ${formatLoad(liveData?.load?.load15)}`,
  ];
  const latencyRows = pingSummary.items.map((item) => ({
    name: item.name,
    current: formatLatency(item.current),
    avg: formatLatency(item.avg),
    loss: formatLoss(item.loss),
  }));

  return (
    <div className="node-detail-body">
      <div className="node-detail-card node-detail-animate" style={{ ["--delay" as any]: "120ms" }}>
        <div className="node-detail-section-title">{t("nodeCard.resource_usage")}</div>
        <div className="node-detail-metric">
          <div className="node-detail-metric-head">
            <span className="node-detail-metric-label">{t("nodeCard.cpu")}</span>
            <span className="node-detail-metric-value">{cpuDisplay}</span>
          </div>
          <MetricBar value={cpuUsage} compact />
        </div>
        <div className="node-detail-metric">
          <div className="node-detail-metric-head">
            <span className="node-detail-metric-label">{t("nodeCard.ram")}</span>
            <span className="node-detail-metric-value">{memoryDisplay}</span>
          </div>
          <MetricBar value={memoryUsagePercent} compact />
        </div>
        <div className="node-detail-metric">
          <div className="node-detail-metric-head">
            <span className="node-detail-metric-label">{t("nodeCard.disk")}</span>
            <span className="node-detail-metric-value">{diskDisplay}</span>
          </div>
          <MetricBar value={diskUsagePercent} compact />
        </div>
        {node.swap_total > 0 && (
          <div className="node-detail-metric">
            <div className="node-detail-metric-head">
              <span className="node-detail-metric-label">{t("nodeCard.swap")}</span>
              <span className="node-detail-metric-value">{swapDisplay}</span>
            </div>
            <MetricBar value={swapUsagePercent} compact />
          </div>
        )}
        {hasTrafficLimit && (
          <TrafficLimitChart
            label={t("nodeCard.trafficLimit")}
            type={getTrafficTypeDisplay(node.traffic_limit_type)}
            percentage={trafficStats.percentage}
            usedLabel={formatBytes(trafficStats.usage)}
            limitLabel={formatBytes(node.traffic_limit || 0)}
          />
        )}
      </div>

      <div className="node-detail-card node-detail-animate" style={{ ["--delay" as any]: "160ms" }}>
        <div className="node-detail-section-title">{t("nodeCard.system_info")}</div>
        <DetailRow label={t("nodeCard.os")} value={node.os} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("nodeCard.kernelVersion")} value={node.kernel_version || "Unknown"} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("nodeCard.arch")} value={node.arch} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("nodeCard.virtualization")} value={node.virtualization || "Unknown"} closeLabel={t("admin.nodeDetail.done")} />
      </div>

      <div className="node-detail-card node-detail-animate" style={{ ["--delay" as any]: "200ms" }}>
        <div className="node-detail-section-title">{t("nodeCard.hardware_info")}</div>
        <DetailRow label={t("nodeCard.cpu")} value={`${node.cpu_name} (x${node.cpu_cores})`} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("admin.nodeDetail.gpu")} value={node.gpu_name || "Unknown"} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("nodeCard.ram")} value={formatBytes(node.mem_total)} closeLabel={t("admin.nodeDetail.done")} />
        <DetailRow label={t("nodeCard.disk")} value={formatBytes(node.disk_total)} closeLabel={t("admin.nodeDetail.done")} />
      </div>

      <div className="node-detail-card node-detail-animate" style={{ ["--delay" as any]: "240ms" }}>
        <div className="node-detail-section-title">{t("nodeCard.network_info")}</div>
        <DetailRow
          label={t("nodeCard.networkSpeed")}
          value={networkSpeedLines}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("nodeCard.totalTraffic")}
          value={totalTrafficLines}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("nodeCard.connections")}
          value={liveData ? `TCP: ${liveData.connections.tcp}, UDP: ${liveData.connections.udp}` : "-"}
          closeLabel={t("admin.nodeDetail.done")}
        />
      </div>

      <div className="node-detail-card node-detail-animate" style={{ ["--delay" as any]: "260ms" }}>
        <div className="node-detail-section-title">
          {t("asset.instanceInfoTitle", { defaultValue: "Asset information" })}
        </div>
        <DetailRow
          label={t("asset.provider", { defaultValue: "Provider" })}
          value={node.provider || node.group || "-"}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.role", { defaultValue: "Role" })}
          value={node.business_role || "-"}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.publicRemark", { defaultValue: "Public remark" })}
          value={node.public_remark || "-"}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.assetContext", { defaultValue: "Context" })}
          value={assetMetaLine || "-"}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.billingCycle", { defaultValue: "Billing cycle" })}
          value={getBillingCycleLabel(node.billing_cycle, t)}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.monthly", { defaultValue: "Monthly" })}
          value={formatCurrencyAmount(monthlyCost, currencyLabel)}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.annualized", { defaultValue: "Annualized" })}
          value={formatCurrencyAmount(annualizedCost, currencyLabel)}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.remainingValue", { defaultValue: "Remaining value" })}
          value={formatCurrencyAmount(remainingValue, currencyLabel)}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.expiry", { defaultValue: "Expiry" })}
          value={assetExpiryInfo?.text || t("asset.noExpiry", { defaultValue: "No expiry" })}
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.autoRenewal", { defaultValue: "Auto renewal" })}
          value={
            node.price > 0
              ? node.auto_renewal
                ? t("asset.autoRenewal", { defaultValue: "Auto renew" })
                : t("asset.manualRenew", { defaultValue: "Manual renew" })
              : t("common.free", { defaultValue: "Free" })
          }
          closeLabel={t("admin.nodeDetail.done")}
        />
        <DetailRow
          label={t("asset.ignoredLabel", { defaultValue: "Ignored from cost rollups" })}
          value={node.asset_ignored ? t("common.yes", { defaultValue: "Yes" }) : t("common.no", { defaultValue: "No" })}
          closeLabel={t("admin.nodeDetail.done")}
        />
      </div>

      <div className="node-detail-runtime-row node-detail-animate" style={{ ["--delay" as any]: "280ms" }}>
        <div className="node-detail-card">
          <div className="node-detail-section-title">{t("nodeCard.runtime_info")}</div>
          <div className="node-detail-runtime-stack">
            <DetailRow label={t("nodeCard.uptime")} value={liveData?.uptime ? formatUptime(liveData.uptime, t) : "-"} closeLabel={t("admin.nodeDetail.done")} />
            <DetailRow label={t("nodeCard.process")} value={liveData?.process?.toString() || "-"} closeLabel={t("admin.nodeDetail.done")} />
            <DetailRow label={t("nodeCard.load")} value={loadLines} closeLabel={t("admin.nodeDetail.done")} />
            <DetailRow
              label={t("nodeCard.last_updated")}
              value={liveData?.updated_at ? new Date(liveData.updated_at).toLocaleString() : "-"}
              closeLabel={t("admin.nodeDetail.done")}
            />
          </div>
        </div>
        <div className="node-detail-card node-detail-latency-inline">
          <div className="node-detail-section-title">{t("nodeCard.ping")}</div>
          <div className="node-detail-latency-table">
            <div className="node-detail-latency-row node-detail-latency-header">
              <span className="node-detail-latency-cell name">{t("Task Name")}</span>
              <span className="node-detail-latency-cell">{t("Current")}</span>
              <span className="node-detail-latency-cell">{t("Avg")}</span>
              <span className="node-detail-latency-cell">{t("Loss")}</span>
            </div>
            <div className="node-detail-latency-body">
              {latencyRows.length ? (
                latencyRows.map((row) => (
                  <div key={row.name} className="node-detail-latency-row">
                    <span className="node-detail-latency-cell name">{row.name}</span>
                    <span className="node-detail-latency-cell">{row.current}</span>
                    <span className="node-detail-latency-cell">{row.avg}</span>
                    <span className="node-detail-latency-cell">{row.loss}</span>
                  </div>
                ))
              ) : (
                <div className="node-detail-latency-row">
                  <span className="node-detail-latency-cell name">-</span>
                  <span className="node-detail-latency-cell">-</span>
                  <span className="node-detail-latency-cell">-</span>
                  <span className="node-detail-latency-cell">-</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  closeLabel,
}: {
  label: string;
  value: string | string[];
  closeLabel: string;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const valueLines = Array.isArray(value) ? value : [value];
  const rawValue = Array.isArray(value) ? value.join(" ") : value;
  const isTruncated = rawValue.length > 22;

  const handleTouchStart = () => {
    if (isTruncated) {
      const timer = setTimeout(() => {
        setDialogOpen(true);
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = () => {
    if (isTruncated) {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <div
        className="node-detail-row"
        style={{ cursor: isTruncated ? "pointer" : "default" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="node-detail-row-label">{label}</div>
        <div className={`node-detail-row-value${valueLines.length > 1 ? " stack" : ""}`}>
          {valueLines.length > 1 ? (
            <div className="node-detail-value-stack">
              {valueLines.map((line) => (
                <span key={line} className="node-detail-value-line">
                  {line}
                </span>
              ))}
            </div>
          ) : (
            valueLines[0]
          )}
        </div>
      </div>

      {isTruncated && (
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Content style={{ maxWidth: "90vw" }}>
            <Dialog.Title>{label}</Dialog.Title>
            <Dialog.Description>
              <div style={{ wordBreak: "break-all", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>
                {valueLines.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </Dialog.Description>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <Dialog.Close>
                <Button variant="soft">{closeLabel}</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  );
};
