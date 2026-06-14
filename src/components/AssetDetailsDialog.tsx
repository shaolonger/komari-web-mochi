import React, { useMemo } from "react";
import { Badge, Button, Card, Flex, Separator, Text } from "@radix-ui/themes";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type AssetMetadataField,
  type AssetRiskLevel,
  type AssetScoreBreakdownItem,
  getAssetRiskTone,
  humanizeAssetMetadataField,
} from "@/utils/assetSignals";
import { formatBytes } from "@/utils";
import {
  formatCurrencyAmount,
  getAssetExpiryInfo,
} from "@/utils/assetMetrics";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

interface AssetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: NodeBasicInfo | null;
  online: boolean;
  providerLabel: string;
  roleLabel: string;
  riskLevel: AssetRiskLevel;
  riskScore: number;
  riskReasons: string[];
  riskBreakdown: AssetScoreBreakdownItem[];
  valueScore: number;
  valueBreakdown: AssetScoreBreakdownItem[];
  decisionLabel: string;
  decisionTone: "green" | "orange" | "blue" | "red";
  decisionReason: string;
  decisionSummary: string[];
  monthlyCost: number;
  annualizedCost: number;
  remainingValue: number;
  daysRemaining: number | null;
  trafficPercentage: number;
  trafficUsage: number;
  cpuUsage: number;
  memoryUsage: number;
  avgLatency: number | null;
  packetLoss: number | null;
  jitterRatio: number | null;
  summary1h: string[];
  summary7d: string[];
  protectedAsset: boolean;
  protectedReason: string | null;
  underused: boolean;
  underusedExcluded: boolean;
  wasteEstimateMonthly: number;
  metadataMissingFields: AssetMetadataField[];
}

const ScoreBlock = ({
  title,
  value,
  items,
}: {
  title: string;
  value: number;
  items: AssetScoreBreakdownItem[];
}) => (
  <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
    <Flex direction="column" gap="3">
      <Flex align="start" justify="between" gap="3">
        <Text size="2" weight="bold">
          {title}
        </Text>
        <Badge color="iris" variant="soft">
          {value}
        </Badge>
      </Flex>
      <Flex direction="column" gap="2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-1)] px-3 py-2"
          >
            <Flex align="center" justify="between" gap="3">
              <Text size="2" weight="medium">
                {item.label}
              </Text>
              <Text size="2" weight="bold">
                {item.value}
              </Text>
            </Flex>
            <Text size="1" color="gray" className="mt-1 block leading-5">
              {item.hint}
            </Text>
          </div>
        ))}
      </Flex>
    </Flex>
  </Card>
);

const SummaryBlock = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => (
  <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
    <Flex direction="column" gap="3">
      <Text size="2" weight="bold">
        {title}
      </Text>
      <Flex direction="column" gap="2">
        {items.map((item) => (
          <Text key={`${title}-${item}`} size="2" color="gray">
            • {item}
          </Text>
        ))}
      </Flex>
    </Flex>
  </Card>
);

const AssetDetailsDialog: React.FC<AssetDetailsDialogProps> = ({
  open,
  onOpenChange,
  node,
  online,
  providerLabel,
  roleLabel,
  riskLevel,
  riskScore,
  riskReasons,
  riskBreakdown,
  valueScore,
  valueBreakdown,
  decisionLabel,
  decisionTone,
  decisionReason,
  decisionSummary,
  monthlyCost,
  annualizedCost,
  remainingValue,
  daysRemaining,
  trafficPercentage,
  trafficUsage,
  cpuUsage,
  memoryUsage,
  avgLatency,
  packetLoss,
  jitterRatio,
  summary1h,
  summary7d,
  protectedAsset,
  protectedReason,
  underused,
  underusedExcluded,
  wasteEstimateMonthly,
  metadataMissingFields,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

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
  const riskTone = getAssetRiskTone(riskLevel);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
      shouldScaleBackground
    >
      <DrawerContent className="max-h-[92vh] overflow-hidden data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[560px]">
        <DrawerHeader className="border-b border-[var(--accent-4)] bg-[var(--accent-1)]">
          <DrawerTitle>{node.name}</DrawerTitle>
          <DrawerDescription>
            {providerLabel} · {roleLabel}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <Flex direction="column" gap="4" mt="4">
            <Flex gap="2" wrap="wrap">
              <Badge color={online ? "green" : "red"} variant="soft">
                {online
                  ? t("nodeCard.online", { defaultValue: "Online" })
                  : t("nodeCard.offline", { defaultValue: "Offline" })}
              </Badge>
              <Badge color={riskTone} variant="soft">
                {t("asset.risk", { defaultValue: "Risk" })} {riskScore}
              </Badge>
              <Badge color="iris" variant="soft">
                {t("asset.valueScore", { defaultValue: "Value" })} {valueScore}
              </Badge>
              <Badge color={decisionTone} variant="soft">
                {decisionLabel}
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
              {protectedAsset && (
                <Badge color="blue" variant="soft">
                  {t("asset.protectedAsset", {
                    defaultValue: "Protected asset",
                  })}
                </Badge>
              )}
              {expiryInfo && (
                <Badge color={expiryInfo.color} variant="soft">
                  {expiryInfo.text}
                </Badge>
              )}
            </Flex>

            <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  {t("asset.decisionPanelTitle", {
                    defaultValue: "Recommended action",
                  })}
                </Text>
                <Text size="2">{decisionReason}</Text>
                <Flex direction="column" gap="1">
                  {decisionSummary.map((item) => (
                    <Text key={item} size="1" color="gray">
                      • {item}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
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
                  <Text size="2">
                    {t("asset.tags", { defaultValue: "Tags" })}: {node.tags || "-"}
                  </Text>
                  {protectedAsset && (
                    <Text size="2" color="blue">
                      {t("asset.protectedReason", {
                        defaultValue: "Protected because",
                      })}
                      : {protectedReason || "-"}
                    </Text>
                  )}
                </Flex>
              </Card>

              <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
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
                  <Text size="2">
                    {t("asset.wasteEstimate", {
                      defaultValue: "Estimated monthly waste",
                    })}
                    :{" "}
                    {wasteEstimateMonthly > 0
                      ? formatCurrencyAmount(wasteEstimateMonthly, currencyLabel)
                      : "-"}
                  </Text>
                </Flex>
              </Card>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
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
                  <Text size="2">
                    {t("asset.networkSummary", { defaultValue: "Network snapshot" })}:{" "}
                    {avgLatency !== null ? `${Math.round(avgLatency)} ms` : "-"}
                    {packetLoss !== null ? ` · ${packetLoss.toFixed(1)}% loss` : ""}
                    {jitterRatio !== null ? ` · ${jitterRatio.toFixed(2)} jitter` : ""}
                  </Text>
                </Flex>
              </Card>

              <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
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
                <Separator size="4" className="my-3" />
                {metadataMissingFields.length > 0 ? (
                  <Flex gap="2" wrap="wrap">
                    {metadataMissingFields.map((field) => (
                      <Badge key={field} color="amber" variant="soft">
                        {humanizeAssetMetadataField(field, t)}
                      </Badge>
                    ))}
                  </Flex>
                ) : (
                  <Text size="2" color="gray">
                    {t("asset.metadataComplete", {
                      defaultValue: "Core metadata is complete.",
                    })}
                  </Text>
                )}
              </Card>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryBlock
                title={t("asset.summary1hTitle", {
                  defaultValue: "Last 1h operational summary",
                })}
                items={summary1h}
              />
              <SummaryBlock
                title={t("asset.summary7dTitle", {
                  defaultValue: "Next 7d action summary",
                })}
                items={summary7d}
              />
            </div>

            {(underused || underusedExcluded) && (
              <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="bold">
                    {t("asset.underusedPanelTitle", {
                      defaultValue: "Idle-spend review",
                    })}
                  </Text>
                  <Text size="2">
                    {underused
                      ? t("asset.underusedPanelBody", {
                          defaultValue:
                            "This asset is a reclaim candidate because utilization has stayed low while spend continues.",
                        })
                      : t("asset.underusedProtectedBody", {
                          defaultValue:
                            "Utilization is low, but the node stays out of reclaim suggestions because it is marked as protected.",
                        })}
                  </Text>
                  {wasteEstimateMonthly > 0 && (
                    <Text size="2" color="gray">
                      {t("asset.wasteEstimate", {
                        defaultValue: "Estimated monthly waste",
                      })}
                      : {formatCurrencyAmount(wasteEstimateMonthly, currencyLabel)}
                    </Text>
                  )}
                </Flex>
              </Card>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <ScoreBlock
                title={t("asset.valueScore", { defaultValue: "Value score" })}
                value={valueScore}
                items={valueBreakdown}
              />
              <ScoreBlock
                title={t("asset.riskScore", { defaultValue: "Risk score" })}
                value={riskScore}
                items={riskBreakdown}
              />
            </div>

            <Card className="border border-[var(--accent-4)] bg-[var(--accent-2)]">
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  {t("asset.riskReasons", { defaultValue: "Risk reasons" })}
                </Text>
                {riskReasons.length === 0 ? (
                  <Text size="2" color="gray">
                    {t("asset.noRisk", {
                      defaultValue:
                        "No active risk indicators in the current ruleset.",
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
            </Card>
          </Flex>
        </div>

        <DrawerFooter className="border-t border-[var(--accent-4)] bg-[var(--accent-1)]">
          <DrawerClose asChild>
            <Button variant="soft">
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AssetDetailsDialog;
