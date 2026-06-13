import React from "react";
import { Badge, Button, Dialog, Flex, Separator, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";

interface ProviderBreakdownItem {
  name: string;
  count: number;
  monthlyCost: string;
  remainingValue: string;
  convertedMonthlyCost: string | null;
  convertedRemainingValue: string | null;
  riskCount: number;
  shareLabel: string;
}

interface CurrencyBreakdownItem {
  key: string;
  label: string;
  count: number;
  monthly: string;
  annualized: string;
  remaining: string;
  convertedMonthly: string | null;
}

interface AssetLifecycleSummary {
  expired: number;
  renewal7d: number;
  renewal30d: number;
  active: number;
  longTerm: number;
  manualRenew: number;
  ignored: number;
}

interface RateInputItem {
  key: string;
  label: string;
  value: string;
}

interface AssetStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAssets: number;
  ignoredAssets: number;
  billableAssets: number;
  highRiskAssets: number;
  monthlySpend: string;
  annualizedSpend: string;
  remainingValue: string;
  renewal7d: string;
  renewal30d: string;
  convertedMonthlySpend: string | null;
  convertedAnnualizedSpend: string | null;
  convertedRemainingValue: string | null;
  convertedRenewal7d: string | null;
  convertedRenewal30d: string | null;
  missingRateCurrencies: string[];
  providerBreakdown: ProviderBreakdownItem[];
  ignoredProviderBreakdown: ProviderBreakdownItem[];
  currencyBreakdown: CurrencyBreakdownItem[];
  lifecycleSummary: AssetLifecycleSummary;
  baseCurrency: string;
  baseCurrencyOptions: Array<{ key: string; label: string }>;
  onBaseCurrencyChange: (value: string) => void;
  providerSortMode: string;
  onProviderSortModeChange: (value: string) => void;
  rateUpdatedAt: string;
  onRateUpdatedAtChange: (value: string) => void;
  rateInputs: RateInputItem[];
  onRateChange: (currencyKey: string, nextValue: string) => void;
}

const StatRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Flex align="center" justify="between" gap="4">
    <Text size="2" color="gray">
      {label}
    </Text>
    <Text size="3" weight="bold">
      {value}
    </Text>
  </Flex>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) => (
  <label className="flex min-w-[170px] flex-col gap-1">
    <Text size="1" color="gray">
      {label}
    </Text>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-[var(--accent-4)] bg-[var(--accent-2)] p-4">
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="1">
        <Text size="3" weight="bold">
          {title}
        </Text>
        {description ? (
          <Text size="1" color="gray">
            {description}
          </Text>
        ) : null}
      </Flex>
      {children}
    </Flex>
  </div>
);

const AssetStatsModal: React.FC<AssetStatsModalProps> = ({
  open,
  onOpenChange,
  totalAssets,
  ignoredAssets,
  billableAssets,
  highRiskAssets,
  monthlySpend,
  annualizedSpend,
  remainingValue,
  renewal7d,
  renewal30d,
  convertedMonthlySpend,
  convertedAnnualizedSpend,
  convertedRemainingValue,
  convertedRenewal7d,
  convertedRenewal30d,
  missingRateCurrencies,
  providerBreakdown,
  ignoredProviderBreakdown,
  currencyBreakdown,
  lifecycleSummary,
  baseCurrency,
  baseCurrencyOptions,
  onBaseCurrencyChange,
  providerSortMode,
  onProviderSortModeChange,
  rateUpdatedAt,
  onRateUpdatedAtChange,
  rateInputs,
  onRateChange,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{ maxWidth: 860, maxHeight: "88vh", overflowY: "auto" }}
      >
        <Dialog.Title>
          {t("asset.statsTitle", { defaultValue: "Asset Statistics" })}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("asset.statsSubtitle", {
            defaultValue:
              "Compare native spend, normalized spend, renewal pressure, and supplier concentration in one place.",
          })}
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <div className="grid gap-3 lg:grid-cols-2">
            <SectionCard
              title={t("asset.statsOverview", { defaultValue: "Portfolio overview" })}
              description={t("asset.statsOverviewHint", {
                defaultValue: "Native-currency totals from the currently filtered asset scope.",
              })}
            >
              <Flex direction="column" gap="2">
                <StatRow
                  label={t("asset.totalAssets", { defaultValue: "Assets" })}
                  value={totalAssets}
                />
                <StatRow
                  label={t("asset.billableAssets", {
                    defaultValue: "Billable assets",
                  })}
                  value={billableAssets}
                />
                <StatRow
                  label={t("asset.ignoredAssets", {
                    defaultValue: "Ignored assets",
                  })}
                  value={ignoredAssets}
                />
                <StatRow
                  label={t("asset.highRisk", { defaultValue: "High-risk assets" })}
                  value={highRiskAssets}
                />
                <StatRow
                  label={t("asset.monthly", { defaultValue: "Monthly spend" })}
                  value={monthlySpend}
                />
                <StatRow
                  label={t("asset.annualized", { defaultValue: "Annualized spend" })}
                  value={annualizedSpend}
                />
                <StatRow
                  label={t("asset.remainingValue", {
                    defaultValue: "Remaining value",
                  })}
                  value={remainingValue}
                />
                <StatRow
                  label={t("asset.renewal7d", {
                    defaultValue: "7-day renewal exposure",
                  })}
                  value={renewal7d}
                />
                <StatRow
                  label={t("asset.renewal30d", {
                    defaultValue: "30-day renewal exposure",
                  })}
                  value={renewal30d}
                />
              </Flex>
            </SectionCard>

            <SectionCard
              title={t("asset.fxControls", { defaultValue: "Normalization controls" })}
              description={t("asset.fxControlsHint", {
                defaultValue:
                  "Use a base currency and manual rates to normalize spend across suppliers.",
              })}
            >
              <Flex gap="3" wrap="wrap">
                <SelectField
                  label={t("asset.baseCurrency", { defaultValue: "Base currency" })}
                  value={baseCurrency}
                  onChange={onBaseCurrencyChange}
                  options={baseCurrencyOptions.map((option) => ({
                    value: option.key,
                    label: `${option.key} (${option.label})`,
                  }))}
                />
                <SelectField
                  label={t("asset.providerSort", {
                    defaultValue: "Provider ranking",
                  })}
                  value={providerSortMode}
                  onChange={onProviderSortModeChange}
                  options={[
                    {
                      value: "monthly",
                      label: t("asset.sortMonthly", { defaultValue: "Monthly spend" }),
                    },
                    {
                      value: "remaining",
                      label: t("asset.sortRemaining", { defaultValue: "Remaining value" }),
                    },
                    {
                      value: "risk",
                      label: t("asset.sortRisk", { defaultValue: "Risk count" }),
                    },
                    {
                      value: "count",
                      label: t("asset.providerSortCount", {
                        defaultValue: "Asset count",
                      }),
                    },
                  ]}
                />
                <label className="flex min-w-[170px] flex-col gap-1">
                  <Text size="1" color="gray">
                    {t("asset.fxUpdatedAt", {
                      defaultValue: "Rates updated at",
                    })}
                  </Text>
                  <input
                    type="date"
                    value={rateUpdatedAt}
                    onChange={(event) => onRateUpdatedAtChange(event.target.value)}
                    className="h-9 rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
                  />
                </label>
              </Flex>

              {missingRateCurrencies.length > 0 ? (
                <Flex gap="2" wrap="wrap">
                  <Badge color="amber" variant="soft">
                    {t("asset.fxMissingRates", {
                      defaultValue: "Missing rates",
                    })}
                  </Badge>
                  {missingRateCurrencies.map((currency) => (
                    <Badge key={currency} color="gray" variant="soft">
                      {currency}
                    </Badge>
                  ))}
                </Flex>
              ) : (
                <Badge color="green" variant="soft">
                  {t("asset.fxReady", {
                    defaultValue: "Normalized totals are available for all visible currencies",
                  })}
                </Badge>
              )}

              <Flex direction="column" gap="2">
                <StatRow
                  label={t("asset.normalizedMonthly", {
                    defaultValue: "Normalized monthly spend",
                  })}
                  value={
                    convertedMonthlySpend ??
                    t("asset.fxIncomplete", {
                      defaultValue: "Incomplete FX coverage",
                    })
                  }
                />
                <StatRow
                  label={t("asset.normalizedAnnualized", {
                    defaultValue: "Normalized annualized spend",
                  })}
                  value={
                    convertedAnnualizedSpend ??
                    t("asset.fxIncomplete", {
                      defaultValue: "Incomplete FX coverage",
                    })
                  }
                />
                <StatRow
                  label={t("asset.normalizedRemaining", {
                    defaultValue: "Normalized remaining value",
                  })}
                  value={
                    convertedRemainingValue ??
                    t("asset.fxIncomplete", {
                      defaultValue: "Incomplete FX coverage",
                    })
                  }
                />
                <StatRow
                  label={t("asset.normalizedRenewal7d", {
                    defaultValue: "Normalized 7-day exposure",
                  })}
                  value={
                    convertedRenewal7d ??
                    t("asset.fxIncomplete", {
                      defaultValue: "Incomplete FX coverage",
                    })
                  }
                />
                <StatRow
                  label={t("asset.normalizedRenewal30d", {
                    defaultValue: "Normalized 30-day exposure",
                  })}
                  value={
                    convertedRenewal30d ??
                    t("asset.fxIncomplete", {
                      defaultValue: "Incomplete FX coverage",
                    })
                  }
                />
              </Flex>
            </SectionCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionCard
              title={t("asset.lifecycle", {
                defaultValue: "Lifecycle buckets",
              })}
              description={t("asset.lifecycleHint", {
                defaultValue:
                  "Quickly see which assets need action now versus later.",
              })}
            >
              <Flex direction="column" gap="2">
                <StatRow
                  label={t("common.expired", { defaultValue: "Expired" })}
                  value={lifecycleSummary.expired}
                />
                <StatRow
                  label={t("asset.lifecycle7d", {
                    defaultValue: "Due within 7 days",
                  })}
                  value={lifecycleSummary.renewal7d}
                />
                <StatRow
                  label={t("asset.lifecycle30d", {
                    defaultValue: "Due within 30 days",
                  })}
                  value={lifecycleSummary.renewal30d}
                />
                <StatRow
                  label={t("asset.lifecycleActive", {
                    defaultValue: "Active over 30 days",
                  })}
                  value={lifecycleSummary.active}
                />
                <StatRow
                  label={t("asset.lifecycleLongTerm", {
                    defaultValue: "Long-term prepaid",
                  })}
                  value={lifecycleSummary.longTerm}
                />
                <StatRow
                  label={t("asset.filterManual", {
                    defaultValue: "Manual renew",
                  })}
                  value={lifecycleSummary.manualRenew}
                />
                <StatRow
                  label={t("asset.filterIgnored", { defaultValue: "Ignored" })}
                  value={lifecycleSummary.ignored}
                />
              </Flex>
            </SectionCard>

            <SectionCard
              title={t("asset.providerSection", {
                defaultValue: "Provider concentration",
              })}
              description={t("asset.providerSectionHint", {
                defaultValue:
                  "Rank suppliers by spend, remaining value, risk, or asset count.",
              })}
            >
              {providerBreakdown.length === 0 ? (
                <Text size="2" color="gray">
                  {t("asset.providerEmpty", {
                    defaultValue: "No provider metadata is available yet.",
                  })}
                </Text>
              ) : (
                <Flex direction="column" gap="2">
                  {providerBreakdown.map((item) => (
                    <Flex
                      key={item.name}
                      align="center"
                      justify="between"
                      gap="4"
                      className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-1)] px-3 py-2"
                    >
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="bold">
                          {item.name}
                        </Text>
                        <Text size="1" color="gray">
                          {item.count}{" "}
                          {t("asset.assetsSuffix", { defaultValue: "assets" })} ·{" "}
                          {item.shareLabel}
                        </Text>
                      </Flex>
                      <Flex align="center" gap="2" wrap="wrap" justify="end">
                        <Badge variant="soft" color="iris">
                          {item.monthlyCost}
                        </Badge>
                        {item.convertedMonthlyCost ? (
                          <Badge variant="soft" color="blue">
                            {item.convertedMonthlyCost}
                          </Badge>
                        ) : null}
                        <Badge variant="soft" color="green">
                          {item.remainingValue}
                        </Badge>
                        {item.convertedRemainingValue ? (
                          <Badge variant="soft" color="jade">
                            {item.convertedRemainingValue}
                          </Badge>
                        ) : null}
                        {item.riskCount > 0 ? (
                          <Badge variant="soft" color="red">
                            {item.riskCount}{" "}
                            {t("asset.providerRisk", { defaultValue: "risk" })}
                          </Badge>
                        ) : null}
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
              )}
            </SectionCard>
          </div>

          {ignoredProviderBreakdown.length > 0 ? (
            <SectionCard
              title={t("asset.ignoredSection", {
                defaultValue: "Ignored asset footprint",
              })}
              description={t("asset.ignoredSectionHint", {
                defaultValue:
                  "Assets excluded from portfolio rollups still appear here for auditability.",
              })}
            >
              <Flex direction="column" gap="2">
                {ignoredProviderBreakdown.map((item) => (
                  <Flex
                    key={item.name}
                    align="center"
                    justify="between"
                    gap="4"
                    className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-1)] px-3 py-2"
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {item.name}
                      </Text>
                      <Text size="1" color="gray">
                        {item.count}{" "}
                        {t("asset.assetsSuffix", { defaultValue: "assets" })}
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2" wrap="wrap" justify="end">
                      <Badge variant="soft" color="gray">
                        {item.monthlyCost}
                      </Badge>
                      <Badge variant="soft" color="gray">
                        {item.remainingValue}
                      </Badge>
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            </SectionCard>
          ) : null}

          <SectionCard
            title={t("asset.currencySection", {
              defaultValue: "Currency buckets and manual rates",
            })}
            description={t("asset.currencySectionHint", {
              defaultValue:
                "Rates are interpreted as the value of 1 unit of the source currency in the selected base currency.",
            })}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <Flex direction="column" gap="2">
                {currencyBreakdown.map((item) => (
                  <Flex
                    key={item.key}
                    align="center"
                    justify="between"
                    gap="4"
                    className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-1)] px-3 py-2"
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {item.key}
                      </Text>
                      <Text size="1" color="gray">
                        {item.label} · {item.count}{" "}
                        {t("asset.assetsSuffix", { defaultValue: "assets" })}
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2" wrap="wrap" justify="end">
                      <Badge variant="soft" color="iris">
                        {item.monthly}
                      </Badge>
                      <Badge variant="soft" color="blue">
                        {item.annualized}
                      </Badge>
                      <Badge variant="soft" color="green">
                        {item.remaining}
                      </Badge>
                      {item.convertedMonthly ? (
                        <Badge variant="soft" color="cyan">
                          {item.convertedMonthly}
                        </Badge>
                      ) : null}
                    </Flex>
                  </Flex>
                ))}
              </Flex>

              <Flex direction="column" gap="2">
                {rateInputs.map((item) => (
                  <label key={item.key} className="flex flex-col gap-1">
                    <Text size="1" color="gray">
                      {item.key === baseCurrency
                        ? t("asset.fxBaseRate", {
                            defaultValue: `${item.key} (base currency)`,
                          })
                        : t("asset.fxRateLabel", {
                            defaultValue: `${item.key} -> ${baseCurrency}`,
                          })}
                    </Text>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={item.value}
                      onChange={(event) =>
                        onRateChange(item.key, event.target.value)
                      }
                      className="h-9 rounded-md border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 text-sm outline-none transition focus:border-[var(--accent-8)]"
                    />
                    <Text size="1" color="gray">
                      {item.label}
                    </Text>
                  </label>
                ))}
              </Flex>
            </div>
          </SectionCard>

          <Separator size="4" />

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

export default AssetStatsModal;
