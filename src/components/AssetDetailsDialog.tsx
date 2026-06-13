import React, { useMemo } from "react";
import { Badge, Button, Dialog, Flex, Separator, Text } from "@radix-ui/themes";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { formatBytes } from "@/utils";
import {
  formatCurrencyAmount,
  getAssetExpiryInfo,
} from "@/utils/assetMetrics";
import { useTranslation } from "react-i18next";

interface AssetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: NodeBasicInfo | null;
  online: boolean;
  providerLabel: string;
  roleLabel: string;
  riskLevel: "high" | "medium" | "low";
  riskReasons: string[];
  monthlyCost: number;
  annualizedCost: number;
  remainingValue: number;
  daysRemaining: number | null;
  trafficPercentage: number;
  trafficUsage: number;
  cpuUsage: number;
  memoryUsage: number;
}

const AssetDetailsDialog: React.FC<AssetDetailsDialogProps> = ({
  open,
  onOpenChange,
  node,
  online,
  providerLabel,
  roleLabel,
  riskLevel,
  riskReasons,
  monthlyCost,
  annualizedCost,
  remainingValue,
  daysRemaining,
  trafficPercentage,
  trafficUsage,
  cpuUsage,
  memoryUsage,
}) => {
  const { t } = useTranslation();

  const capabilityItems = useMemo(() => {
    if (!node) return [];
    return [
      {
        label: t("asset.capabilityPing", { defaultValue: "Ping tasks" }),
        enabled: Boolean(node.capability_ping),
      },
      {
        label: t("asset.capabilityTerminal", { defaultValue: "Terminal" }),
        enabled: Boolean(node.capability_terminal),
      },
      {
        label: t("asset.capabilityExec", { defaultValue: "Remote exec" }),
        enabled: Boolean(node.capability_remote_exec),
      },
      {
        label: t("asset.capabilityControl", { defaultValue: "Remote control" }),
        enabled: Boolean(node.capability_remote_control),
      },
      {
        label: t("asset.capabilityAutoUpdate", { defaultValue: "Auto update" }),
        enabled: Boolean(node.capability_auto_update),
      },
      {
        label: t("asset.capabilityGpu", { defaultValue: "GPU telemetry" }),
        enabled: Boolean(node.capability_gpu),
      },
      {
        label: t("asset.capabilityPrivatePing", {
          defaultValue: "Private ping targets",
        }),
        enabled: Boolean(node.capability_private_ping_targets),
      },
    ];
  }, [node, t]);

  const expiryInfo = useMemo(() => {
    if (!node) return null;
    return getAssetExpiryInfo(node, t);
  }, [node, t]);

  if (!node) return null;

  const currencyLabel = node.currency || node.currency_code || "?";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 760, maxHeight: "85vh", overflowY: "auto" }}>
        <Dialog.Title>{node.name}</Dialog.Title>
        <Dialog.Description size="2">
          {providerLabel} · {roleLabel}
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          <Flex gap="2" wrap="wrap">
            <Badge color={online ? "green" : "red"} variant="soft">
              {online
                ? t("nodeCard.online", { defaultValue: "Online" })
                : t("nodeCard.offline", { defaultValue: "Offline" })}
            </Badge>
            <Badge
              color={
                riskLevel === "high"
                  ? "red"
                  : riskLevel === "medium"
                    ? "orange"
                    : "green"
              }
              variant="soft"
            >
              {riskLevel}
            </Badge>
            {!node.auto_renewal && node.price > 0 && (
              <Badge color="amber" variant="soft">
                {t("asset.manualRenew", { defaultValue: "Manual renew" })}
              </Badge>
            )}
            {node.asset_ignored && (
              <Badge color="gray" variant="soft">
                {t("asset.ignoredLabel", {
                  defaultValue: "Ignored from cost rollups",
                })}
              </Badge>
            )}
            {expiryInfo && (
              <Badge color={expiryInfo.color} variant="soft">
                {expiryInfo.text}
              </Badge>
            )}
          </Flex>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] p-3">
              <Text size="2" weight="bold">
                {t("asset.businessMeta", { defaultValue: "Business metadata" })}
              </Text>
              <Flex direction="column" gap="2" mt="3">
                <Text size="2">
                  {t("asset.provider", { defaultValue: "Provider" })}: {providerLabel}
                </Text>
                <Text size="2">
                  {t("asset.role", { defaultValue: "Role" })}: {roleLabel}
                </Text>
                <Text size="2">
                  {t("asset.groupLabel", { defaultValue: "Group" })}: {node.group || "-"}
                </Text>
                <Text size="2">
                  {t("asset.currencyCode", { defaultValue: "Currency code" })}: {node.currency_code || "-"}
                </Text>
                <Text size="2">
                  {t("asset.publicRemark", { defaultValue: "Public remark" })}: {node.public_remark || "-"}
                </Text>
              </Flex>
            </div>

            <div className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] p-3">
              <Text size="2" weight="bold">
                {t("asset.financialMeta", { defaultValue: "Financial snapshot" })}
              </Text>
              <Flex direction="column" gap="2" mt="3">
                <Text size="2">
                  {t("asset.monthly", { defaultValue: "Monthly" })}: {formatCurrencyAmount(monthlyCost, currencyLabel)}
                </Text>
                <Text size="2">
                  {t("asset.annualized", { defaultValue: "Annualized" })}: {formatCurrencyAmount(annualizedCost, currencyLabel)}
                </Text>
                <Text size="2">
                  {t("asset.remainingValue", { defaultValue: "Remaining value" })}: {formatCurrencyAmount(remainingValue, currencyLabel)}
                </Text>
                <Text size="2">
                  {t("asset.billingCycle", { defaultValue: "Billing cycle" })}: {node.billing_cycle || "-"}
                </Text>
                <Text size="2">
                  {t("asset.daysRemaining", { defaultValue: "Days remaining" })}: {daysRemaining ?? "-"}
                </Text>
              </Flex>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] p-3">
              <Text size="2" weight="bold">
                {t("asset.utilization", { defaultValue: "Utilization" })}
              </Text>
              <Flex direction="column" gap="2" mt="3">
                <Text size="2">CPU: {cpuUsage.toFixed(1)}%</Text>
                <Text size="2">RAM: {memoryUsage.toFixed(1)}%</Text>
                <Text size="2">
                  {t("asset.traffic", { defaultValue: "Traffic" })}:{" "}
                  {trafficPercentage > 0
                    ? `${trafficPercentage.toFixed(1)}%`
                    : formatBytes(trafficUsage)}
                </Text>
                <Text size="2">
                  {t("asset.trafficLimit", { defaultValue: "Traffic limit" })}:{" "}
                  {node.traffic_limit ? formatBytes(node.traffic_limit) : "-"}
                </Text>
              </Flex>
            </div>

            <div className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] p-3">
              <Text size="2" weight="bold">
                {t("asset.capabilities", { defaultValue: "Capabilities" })}
              </Text>
              <Flex gap="2" wrap="wrap" mt="3">
                {capabilityItems.map((item) => (
                  <Badge
                    key={item.label}
                    color={item.enabled ? "green" : "gray"}
                    variant="soft"
                  >
                    {item.label}: {item.enabled ? "on" : "off"}
                  </Badge>
                ))}
              </Flex>
            </div>
          </div>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              {t("asset.riskReasons", { defaultValue: "Risk reasons" })}
            </Text>
            {riskReasons.length === 0 ? (
              <Text size="2" color="gray">
                {t("asset.noRisk", {
                  defaultValue: "No active risk indicators in the current ruleset.",
                })}
              </Text>
            ) : (
              riskReasons.map((reason) => (
                <Text key={reason} size="2" color="gray">
                  • {reason}
                </Text>
              ))
            )}
          </Flex>

          <Flex justify="end">
            <Dialog.Close>
              <Button variant="soft">
                {t("common.close", { defaultValue: "Close" })}
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default AssetDetailsDialog;
