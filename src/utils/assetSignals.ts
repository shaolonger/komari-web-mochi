import type { TFunction } from "i18next";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { PingSummaryTask } from "@/hooks/usePingSummaryMap";
import type { Record as LiveNodeData } from "@/types/LiveData";
import { getTrafficStats } from "@/utils";
import {
  getAnnualizedCost,
  getDaysUntilExpiry,
  getMonthlyCost,
  getRemainingValue,
} from "@/utils/assetMetrics";

export type AssetRiskLevel = "high" | "medium" | "low";
export type AssetDecision = "retain" | "observe" | "renew" | "reclaim";
export type AssetMetadataField =
  | "provider"
  | "business_role"
  | "currency_code"
  | "expired_at";
export type AssetRiskReasonCode =
  | "offline_or_stale"
  | "data_stale"
  | "renewal_due_7d"
  | "renewal_due_30d"
  | "manual_renewal"
  | "traffic_above_90pct"
  | "traffic_above_75pct"
  | "network_quality"
  | "metadata_gap"
  | "capability_ping_disabled"
  | "no_remediation_path"
  | "capability_auto_update_disabled"
  | "underused_spend"
  | "protected_underused";

export interface AssetScoreBreakdownItem {
  key: string;
  label: string;
  value: number;
  hint: string;
  tone: "positive" | "negative" | "neutral";
}

export interface AssetSignalRow {
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
  valueScore: number;
  underused: boolean;
  underusedExcluded: boolean;
  wasteEstimateMonthly: number;
  protectedAsset: boolean;
  protectedReason: string | null;
  metadataMissingFields: AssetMetadataField[];
  riskScore: number;
  riskLevel: AssetRiskLevel;
  riskReasonCodes: AssetRiskReasonCode[];
  riskReasons: string[];
  valueBreakdown: AssetScoreBreakdownItem[];
  riskBreakdown: AssetScoreBreakdownItem[];
  decision: AssetDecision;
  decisionLabel: string;
  decisionReason: string;
  decisionSummary: string[];
  summary1h: string[];
  summary7d: string[];
}

const STALE_REPORT_MINUTES = 10;
const NETWORK_LOSS_WARN = 5;
const NETWORK_LATENCY_WARN = 180;
const NETWORK_JITTER_WARN = 0.6;
const PROTECTED_KEYWORDS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /(^|[\s;,_/-])(critical|core|protected|primary|production|prod|keep)([\s;,_/-]|$)/i,
    reason: "Explicit critical/protected marker",
  },
  {
    pattern: /(关键|核心|保留|生产)/,
    reason: "Critical business wording",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getProviderLabel = (node: NodeBasicInfo, fallback: string) =>
  node.provider?.trim() || node.group?.trim() || fallback;

const getRoleLabel = (node: NodeBasicInfo, fallback: string) =>
  node.business_role?.trim() || node.public_remark?.trim() || fallback;

function buildFallbackPingStats(tasks: PingSummaryTask[]) {
  return tasks.map((task) => ({
    name: task.name,
    latest: task.max,
    avg: task.avg,
    tail: 0,
    loss: task.loss,
    min: task.min,
    max: task.max,
  }));
}

function detectProtectedAsset(node: NodeBasicInfo): {
  protectedAsset: boolean;
  protectedReason: string | null;
} {
  const sources = [
    node.tags,
    node.business_role,
    node.public_remark,
    node.group,
  ]
    .filter(Boolean)
    .join(" ; ");

  if (!sources.trim()) {
    return { protectedAsset: false, protectedReason: null };
  }

  const matched = PROTECTED_KEYWORDS.find(({ pattern }) => pattern.test(sources));
  if (!matched) {
    return { protectedAsset: false, protectedReason: null };
  }

  return {
    protectedAsset: true,
    protectedReason: matched.reason,
  };
}

export function getAssetDecisionTone(decision: AssetDecision):
  | "green"
  | "orange"
  | "blue"
  | "red" {
  switch (decision) {
    case "renew":
      return "orange";
    case "reclaim":
      return "red";
    case "observe":
      return "blue";
    case "retain":
    default:
      return "green";
  }
}

export function getAssetRiskTone(level: AssetRiskLevel):
  | "green"
  | "orange"
  | "red" {
  switch (level) {
    case "high":
      return "red";
    case "medium":
      return "orange";
    case "low":
    default:
      return "green";
  }
}

export function getAssetDecisionLabel(decision: AssetDecision, t: TFunction): string {
  switch (decision) {
    case "renew":
      return t("asset.decisionRenew", { defaultValue: "Renew" });
    case "reclaim":
      return t("asset.decisionReclaim", { defaultValue: "Reclaim" });
    case "observe":
      return t("asset.decisionObserve", { defaultValue: "Observe" });
    case "retain":
    default:
      return t("asset.decisionRetain", { defaultValue: "Retain" });
  }
}

export function humanizeAssetMetadataField(
  field: AssetMetadataField,
  t: TFunction
): string {
  switch (field) {
    case "provider":
      return t("asset.provider", { defaultValue: "Provider" });
    case "business_role":
      return t("asset.role", { defaultValue: "Role" });
    case "currency_code":
      return t("asset.currencyCode", { defaultValue: "Currency code" });
    case "expired_at":
      return t("asset.expiry", { defaultValue: "Expiry date" });
    default:
      return field;
  }
}

export function humanizeAssetRiskReason(
  reason: AssetRiskReasonCode,
  t: TFunction
): string {
  switch (reason) {
    case "offline_or_stale":
      return t("asset.riskOffline", { defaultValue: "Offline or stale" });
    case "data_stale":
      return t("asset.riskDataStale", {
        defaultValue: "Telemetry is stale and should be refreshed",
      });
    case "renewal_due_7d":
      return t("asset.riskRenew7d", {
        defaultValue: "Renewal required within 7 days",
      });
    case "renewal_due_30d":
      return t("asset.riskRenew30d", {
        defaultValue: "Renewal required within 30 days",
      });
    case "manual_renewal":
      return t("asset.riskManualRenew", {
        defaultValue: "Manual renewal only",
      });
    case "traffic_above_90pct":
      return t("asset.riskTraffic", {
        defaultValue: "Traffic usage above 90%",
      });
    case "traffic_above_75pct":
      return t("asset.riskTrafficWatch", {
        defaultValue: "Traffic usage above 75%",
      });
    case "network_quality":
      return t("asset.riskNetworkQuality", {
        defaultValue:
          "Recent ping quality shows elevated latency, loss, or jitter",
      });
    case "metadata_gap":
      return t("asset.riskMetadataGap", {
        defaultValue: "Metadata is incomplete for this asset",
      });
    case "capability_ping_disabled":
      return t("asset.riskNoPing", {
        defaultValue: "No ping capability is enabled on the agent",
      });
    case "no_remediation_path":
      return t("asset.riskNoRemediation", {
        defaultValue: "No terminal or remote-exec remediation path",
      });
    case "capability_auto_update_disabled":
      return t("asset.riskNoAutoUpdate", {
        defaultValue: "Agent auto-update is disabled",
      });
    case "underused_spend":
      return t("asset.riskUnderused", {
        defaultValue: "Low utilization relative to ongoing spend",
      });
    case "protected_underused":
      return t("asset.riskProtectedUnderused", {
        defaultValue:
          "Low utilization is visible, but this asset is marked as business-critical",
      });
    default:
      return reason;
  }
}

function buildDecisionSummary(
  decision: AssetDecision,
  monthlyCost: number,
  wasteEstimateMonthly: number,
  daysRemaining: number | null,
  protectedAsset: boolean,
  metadataMissingFields: AssetMetadataField[],
  t: TFunction
): { reason: string; summary: string[] } {
  if (decision === "renew") {
    return {
      reason: t("asset.decisionReasonRenew", {
        defaultValue:
          daysRemaining !== null && daysRemaining <= 7
            ? "This asset expires within 7 days and needs renewal handling."
            : "This asset expires within 30 days and should be renewed or confirmed.",
      }),
      summary: [
        t("asset.summaryRenewWindow", {
          defaultValue:
            daysRemaining !== null
              ? `${daysRemaining} days of runway left`
              : "Renewal window requires attention",
        }),
        t("asset.summaryRenewSpend", {
          defaultValue: `Next-cycle spend impact: ${monthlyCost.toFixed(2)} / month equivalent`,
        }),
      ],
    };
  }

  if (decision === "reclaim") {
    return {
      reason: t("asset.decisionReasonReclaim", {
        defaultValue:
          "Low utilization and ongoing spend make this a reclaim candidate.",
      }),
      summary: [
        t("asset.summaryWaste", {
          defaultValue: `Estimated monthly waste: ${wasteEstimateMonthly.toFixed(2)}`,
        }),
        t("asset.summaryReclaim", {
          defaultValue: "Not marked as a protected business node",
        }),
      ],
    };
  }

  if (decision === "observe") {
    return {
      reason: t("asset.decisionReasonObserve", {
        defaultValue:
          protectedAsset
            ? "It shows low utilization, but critical markers mean it should be watched rather than reclaimed."
            : "There are risks or data gaps worth watching before taking action.",
      }),
      summary: [
        protectedAsset
          ? t("asset.summaryProtected", {
              defaultValue: "Protected business markers are present",
            })
          : t("asset.summaryObserve", {
              defaultValue: "Monitor risk, quality, or metadata signals",
            }),
        metadataMissingFields.length > 0
          ? t("asset.summaryMetadataGap", {
              defaultValue: `${metadataMissingFields.length} metadata fields still need cleanup`,
            })
          : t("asset.summaryNoMetadataGap", {
              defaultValue: "Metadata is mostly complete",
            }),
      ],
    };
  }

  return {
    reason: t("asset.decisionReasonRetain", {
      defaultValue: "This asset looks healthy enough to keep in service.",
    }),
    summary: [
      t("asset.summaryRetain", {
        defaultValue: "No immediate renewal or reclamation action is needed",
      }),
      t("asset.summaryRetainHealthy", {
        defaultValue: "Risk and observability signals are within a manageable range",
      }),
    ],
  };
}

export function buildAssetSignalRow({
  node,
  live,
  online,
  pingSummaryTasks,
  nowMs,
  t,
}: {
  node: NodeBasicInfo;
  live?: LiveNodeData;
  online: boolean;
  pingSummaryTasks?: PingSummaryTask[];
  nowMs: number;
  t: TFunction;
}): AssetSignalRow {
  const trafficStats = getTrafficStats(
    live?.network?.totalUp ?? 0,
    live?.network?.totalDown ?? 0,
    node.traffic_limit,
    node.traffic_limit_type
  );
  const pingStats = Object.values(live?.ping ?? {});
  const fallbackPingStats =
    pingStats.length > 0 ? pingStats : buildFallbackPingStats(pingSummaryTasks ?? []);
  const cpuUsage = live?.cpu?.usage ?? 0;
  const memoryUsage =
    node.mem_total && live?.ram?.used ? (live.ram.used / node.mem_total) * 100 : 0;
  const daysRemaining = getDaysUntilExpiry(node.expired_at);
  const updatedAt =
    typeof live?.updated_at === "string" ? new Date(live.updated_at) : null;
  const stale =
    Boolean(live) &&
    (!updatedAt ||
      Number.isNaN(updatedAt.getTime()) ||
      nowMs - updatedAt.getTime() > STALE_REPORT_MINUTES * 60 * 1000);

  const worstPing = fallbackPingStats.reduce<(typeof fallbackPingStats)[number] | null>(
    (worst, current) => {
      if (!worst) return current;
      const currentScore = current.loss * 4 + current.tail * 3 + current.avg / 100;
      const worstScore = worst.loss * 4 + worst.tail * 3 + worst.avg / 100;
      return currentScore > worstScore ? current : worst;
    },
    pingStats[0] ?? null
  );

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

  const metadataMissingFields: AssetMetadataField[] = [];
  if (!node.provider?.trim()) metadataMissingFields.push("provider");
  if (!node.business_role?.trim()) metadataMissingFields.push("business_role");
  if (!node.currency_code?.trim()) metadataMissingFields.push("currency_code");
  if (!node.expired_at) metadataMissingFields.push("expired_at");

  const monthlyCost = getMonthlyCost(node.price, node.billing_cycle);
  const annualizedCost = getAnnualizedCost(node.price, node.billing_cycle);
  const remainingValue = getRemainingValue(node);
  const utilizationSignal = clamp(
    Math.max(
      cpuUsage / 100,
      memoryUsage / 100,
      Math.min(trafficStats.percentage, 100) / 100
    ),
    0,
    1
  );
  const efficiencyScore = monthlyCost * (1 - utilizationSignal);

  const { protectedAsset, protectedReason } = detectProtectedAsset(node);
  const underusedCandidate =
    online &&
    node.price > 0 &&
    !node.asset_ignored &&
    daysRemaining !== null &&
    daysRemaining > 30 &&
    cpuUsage < 10 &&
    memoryUsage < 25 &&
    trafficStats.percentage < 15;
  const underused = underusedCandidate && !protectedAsset;
  const underusedExcluded = underusedCandidate && protectedAsset;
  const wasteEstimateMonthly =
    underusedCandidate && monthlyCost > 0
      ? monthlyCost * clamp(1 - utilizationSignal, 0.35, 0.95)
      : 0;

  const riskBreakdown: AssetScoreBreakdownItem[] = [];
  const addRisk = (
    code: AssetRiskReasonCode,
    value: number,
    hint?: string
  ) => {
    riskBreakdown.push({
      key: code,
      label: humanizeAssetRiskReason(code, t),
      value,
      hint: hint || humanizeAssetRiskReason(code, t),
      tone: "negative",
    });
  };

  if (!online) addRisk("offline_or_stale", 28);
  if (stale) addRisk("data_stale", 12);
  if (daysRemaining !== null && daysRemaining <= 7) {
    addRisk("renewal_due_7d", 25);
  } else if (daysRemaining !== null && daysRemaining <= 30) {
    addRisk("renewal_due_30d", 14);
  }
  if (daysRemaining !== null && daysRemaining <= 30 && !node.auto_renewal && node.price > 0) {
    addRisk("manual_renewal", 18);
  }
  if (trafficStats.percentage >= 90) {
    addRisk("traffic_above_90pct", 20);
  } else if (trafficStats.percentage >= 75) {
    addRisk("traffic_above_75pct", 8);
  }
  if (networkIssue) addRisk("network_quality", 14);
  if (metadataMissingFields.length > 0) addRisk("metadata_gap", 8);
  if (!node.capability_ping) addRisk("capability_ping_disabled", 8);
  if (!node.capability_terminal && !node.capability_remote_exec) {
    addRisk("no_remediation_path", 14);
  }
  if (!node.capability_auto_update) {
    addRisk("capability_auto_update_disabled", 6);
  }
  if (underused) addRisk("underused_spend", 12);
  if (underusedExcluded) addRisk("protected_underused", 6);

  const riskScore = clamp(
    riskBreakdown.reduce((total, item) => total + item.value, 0),
    0,
    100
  );
  const riskLevel: AssetRiskLevel =
    riskScore >= 45 ? "high" : riskScore >= 20 ? "medium" : "low";

  const capabilityCoverage =
    [
      node.capability_ping,
      node.capability_terminal || node.capability_remote_exec,
      node.capability_auto_update,
      node.capability_remote_control || node.capability_private_ping_targets,
    ].filter(Boolean).length / 4;
  const metadataCompleteness =
    1 - metadataMissingFields.length / 4;
  const runwayScore =
    daysRemaining === null
      ? 0.45
      : daysRemaining <= 7
        ? 0.1
        : daysRemaining <= 30
          ? 0.35
          : node.auto_renewal
            ? 1
            : 0.75;

  const valueBreakdown: AssetScoreBreakdownItem[] = [
    {
      key: "business_priority",
      label: t("asset.scoreBusinessPriority", {
        defaultValue: "Business priority",
      }),
      value: protectedAsset ? 26 : node.business_role?.trim() ? 16 : 8,
      hint: protectedAsset
        ? t("asset.scoreBusinessPriorityHint", {
            defaultValue: "Critical/protected markers raise the value of keeping this node available.",
          })
        : t("asset.scoreBusinessPriorityHintNormal", {
            defaultValue: "Role and remark data help explain why this node exists.",
          }),
      tone: "positive",
    },
    {
      key: "live_utilization",
      label: t("asset.scoreLiveUtilization", {
        defaultValue: "Live utilization",
      }),
      value: Math.round(utilizationSignal * 22),
      hint: t("asset.scoreLiveUtilizationHint", {
        defaultValue: "Higher sustained usage usually signals stronger practical value.",
      }),
      tone: "positive",
    },
    {
      key: "control_coverage",
      label: t("asset.scoreControlCoverage", {
        defaultValue: "Control coverage",
      }),
      value: Math.round(capabilityCoverage * 18),
      hint: t("asset.scoreControlCoverageHint", {
        defaultValue: "Ping, shell/exec, and update paths make an asset easier to operate safely.",
      }),
      tone: "positive",
    },
    {
      key: "runtime_health",
      label: t("asset.scoreRuntimeHealth", {
        defaultValue: "Runtime health",
      }),
      value: online ? 12 : 2,
      hint: online
        ? t("asset.scoreRuntimeHealthHint", {
            defaultValue: "The node is online and currently observable.",
          })
        : t("asset.scoreRuntimeHealthHintOffline", {
            defaultValue: "Offline assets provide less immediate business value.",
          }),
      tone: "positive",
    },
    {
      key: "renewal_runway",
      label: t("asset.scoreRenewalRunway", {
        defaultValue: "Renewal runway",
      }),
      value: Math.round(runwayScore * 12),
      hint: t("asset.scoreRenewalRunwayHint", {
        defaultValue: "Healthy runway and auto-renew lower the chance of surprise interruptions.",
      }),
      tone: "positive",
    },
    {
      key: "metadata_quality",
      label: t("asset.scoreMetadataQuality", {
        defaultValue: "Metadata quality",
      }),
      value: Math.round(metadataCompleteness * 10),
      hint: t("asset.scoreMetadataQualityHint", {
        defaultValue: "Complete provider, role, currency, and expiry data make the asset easier to govern.",
      }),
      tone: "positive",
    },
  ];

  const valueScore = clamp(
    valueBreakdown.reduce((total, item) => total + item.value, 0),
    0,
    100
  );

  let decision: AssetDecision = "retain";
  if (node.price > 0 && daysRemaining !== null && daysRemaining <= 30) {
    decision = "renew";
  } else if (underused) {
    decision = "reclaim";
  } else if (riskLevel !== "low" || underusedExcluded || metadataMissingFields.length > 0) {
    decision = "observe";
  }

  const decisionMeta = buildDecisionSummary(
    decision,
    monthlyCost,
    wasteEstimateMonthly,
    daysRemaining,
    protectedAsset,
    metadataMissingFields,
    t
  );

  const summary1h = [
    fallbackPingStats.length > 0
      ? t("asset.summary1hTasks", {
          defaultValue: `${fallbackPingStats.length} ping tasks sampled`,
        })
      : t("asset.summary1hNoTasks", {
          defaultValue: "No recent ping task summary is available",
        }),
    avgLatency !== null
      ? t("asset.summary1hLatency", {
          defaultValue: `Worst-target average latency ${Math.round(avgLatency)} ms`,
        })
      : t("asset.summary1hLatencyNone", {
          defaultValue: "No latency sample in the last hour",
        }),
    packetLoss !== null
      ? t("asset.summary1hLoss", {
          defaultValue: `Packet loss ${packetLoss.toFixed(1)}%`,
        })
      : t("asset.summary1hLossNone", {
          defaultValue: "No packet-loss sample in the last hour",
        }),
  ];

  const summary7d = [
    daysRemaining !== null && daysRemaining <= 7
      ? t("asset.summary7dRenew", {
          defaultValue: "Renewal handling is needed within 7 days",
        })
      : t("asset.summary7dRunway", {
          defaultValue: "No renewal deadline inside the next 7 days",
        }),
    !node.auto_renewal && node.price > 0
      ? t("asset.summary7dManual", {
          defaultValue: "Manual renewal path should be confirmed this week",
        })
      : t("asset.summary7dAuto", {
          defaultValue: "Auto-renew coverage reduces near-term intervention",
        }),
    wasteEstimateMonthly > 0
      ? t("asset.summary7dWaste", {
          defaultValue: `Potential monthly waste to review: ${wasteEstimateMonthly.toFixed(2)}`,
        })
      : t("asset.summary7dWasteNone", {
          defaultValue: "No strong idle-spend signal for the coming week",
        }),
  ];

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
    monthlyCost,
    annualizedCost,
    remainingValue,
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
    valueScore,
    underused,
    underusedExcluded,
    wasteEstimateMonthly,
    protectedAsset,
    protectedReason,
    metadataMissingFields,
    riskScore,
    riskLevel,
    riskReasonCodes: riskBreakdown.map((item) => item.key as AssetRiskReasonCode),
    riskReasons: riskBreakdown.map((item) => item.label),
    valueBreakdown,
    riskBreakdown,
    decision,
    decisionLabel: getAssetDecisionLabel(decision, t),
    decisionReason: decisionMeta.reason,
    decisionSummary: decisionMeta.summary,
    summary1h,
    summary7d,
  };
}
