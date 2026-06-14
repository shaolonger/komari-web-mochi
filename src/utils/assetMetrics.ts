import type { TFunction } from "i18next";

export interface AssetBillingLike {
  price?: number | null;
  billing_cycle?: number | null;
  currency?: string | null;
  currency_code?: string | null;
  expired_at?: string | number | Date | null;
  asset_ignored?: boolean | null;
  provider?: string | null;
}

export interface AssetExpiryInfo {
  color: "red" | "orange" | "green";
  text: string;
  daysRemaining: number;
}

export interface AssetCurrencySummary {
  key: string;
  label: string;
  count: number;
  monthly: number;
  annualized: number;
  remaining: number;
  renewal7d: number;
  renewal30d: number;
}

export interface AssetConvertedSummary {
  value: number;
  missingCurrencies: string[];
}

const LONG_TERM_DAYS = 36500;

export function isBillableAsset(price?: number | null): boolean {
  return Number(price) > 0;
}

export function getBillingCycleLabel(
  billingCycle: number | null | undefined,
  t: TFunction
): string {
  const cycle = Number(billingCycle ?? 0);
  if (cycle >= 27 && cycle <= 32) return t("common.monthly");
  if (cycle >= 87 && cycle <= 95) return t("common.quarterly");
  if (cycle >= 175 && cycle <= 185) return t("common.semi_annual");
  if (cycle >= 360 && cycle <= 370) return t("common.annual");
  if (cycle >= 720 && cycle <= 750) return t("common.biennial");
  if (cycle >= 1080 && cycle <= 1150) return t("common.triennial");
  if (cycle === -1) return t("common.once");
  return `${cycle} ${t("nodeCard.time_day")}`;
}

export function formatAssetPriceTag(
  asset: AssetBillingLike,
  t: TFunction
): string {
  const price = Number(asset.price ?? 0);
  if (price === 0) return "";
  if (price === -1) return t("common.free");
  const currency = asset.currency || "￥";
  return `${currency}${price}/${getBillingCycleLabel(asset.billing_cycle, t)}`;
}

export function getDaysUntilExpiry(
  expiredAt: AssetBillingLike["expired_at"],
  now = new Date()
): number | null {
  if (!expiredAt) return null;
  const expiredDate = new Date(expiredAt);
  if (Number.isNaN(expiredDate.getTime())) return null;
  const diffTime = expiredDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getAssetExpiryInfo(
  asset: Pick<AssetBillingLike, "expired_at" | "price">,
  t: TFunction,
  now = new Date()
): AssetExpiryInfo | null {
  if (!asset.expired_at || Number(asset.price ?? 0) === 0) return null;

  const daysRemaining = getDaysUntilExpiry(asset.expired_at, now);
  if (daysRemaining === null) return null;

  const color: AssetExpiryInfo["color"] =
    daysRemaining <= 0 || daysRemaining <= 7
      ? "red"
      : daysRemaining <= 15
        ? "orange"
        : "green";

  const text =
    daysRemaining <= 0
      ? t("common.expired")
      : daysRemaining > LONG_TERM_DAYS
        ? t("common.long_term")
        : t("common.expired_in", { days: daysRemaining });

  return {
    color,
    text,
    daysRemaining,
  };
}

export function getMonthlyCost(
  price: number | null | undefined,
  billingCycle: number | null | undefined
): number {
  if (!isBillableAsset(price)) return 0;
  const cycle = Number(billingCycle ?? 0);
  if (!Number.isFinite(cycle) || cycle <= 0) return 0;
  return (Number(price) * 30) / cycle;
}

export function getAnnualizedCost(
  price: number | null | undefined,
  billingCycle: number | null | undefined
): number {
  return getMonthlyCost(price, billingCycle) * 12;
}

export function getRemainingValue(
  asset: AssetBillingLike,
  now = new Date()
): number {
  if (!isBillableAsset(asset.price)) return 0;
  const cycle = Number(asset.billing_cycle ?? 0);
  if (!Number.isFinite(cycle) || cycle <= 0) return 0;
  const daysRemaining = getDaysUntilExpiry(asset.expired_at, now);
  if (daysRemaining === null || daysRemaining <= 0) return 0;
  return Number(asset.price) * (daysRemaining / cycle);
}

export function getRenewalExposure(
  assets: AssetBillingLike[],
  windowDays: number,
  now = new Date()
): number {
  return assets.reduce((total, asset) => {
    if (!isBillableAsset(asset.price) || asset.asset_ignored) return total;
    const daysRemaining = getDaysUntilExpiry(asset.expired_at, now);
    if (daysRemaining === null || daysRemaining <= 0 || daysRemaining > windowDays) {
      return total;
    }
    return total + Number(asset.price);
  }, 0);
}

export function getCurrencyLabel(asset: Pick<AssetBillingLike, "currency" | "currency_code">): string {
  return asset.currency || asset.currency_code || "?";
}

export function getCurrencyKey(
  asset: Pick<AssetBillingLike, "currency" | "currency_code">
): string {
  return asset.currency_code || asset.currency || "?";
}

export function groupAssetFinancials(
  assets: AssetBillingLike[],
  now = new Date()
): AssetCurrencySummary[] {
  const grouped = new Map<string, AssetCurrencySummary>();

  assets.forEach((asset) => {
    if (asset.asset_ignored) return;
    const key = getCurrencyKey(asset);
    const current = grouped.get(key) ?? {
      key,
      label: getCurrencyLabel(asset),
      count: 0,
      monthly: 0,
      annualized: 0,
      remaining: 0,
      renewal7d: 0,
      renewal30d: 0,
    };

    current.count += 1;
    current.monthly += getMonthlyCost(asset.price, asset.billing_cycle);
    current.annualized += getAnnualizedCost(asset.price, asset.billing_cycle);
    current.remaining += getRemainingValue(asset, now);
    current.renewal7d += getRenewalExposure([asset], 7, now);
    current.renewal30d += getRenewalExposure([asset], 30, now);
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.monthly - a.monthly);
}

export function formatCurrencyAmount(
  value: number,
  label: string
): string {
  return `${label}${value.toFixed(2)}`;
}

export function formatCurrencySummary(
  groups: AssetCurrencySummary[],
  field: keyof Pick<AssetCurrencySummary, "monthly" | "annualized" | "remaining" | "renewal7d" | "renewal30d">
): string {
  if (!groups.length) return "0";
  return groups
    .map((group) => formatCurrencyAmount(group[field], group.label))
    .join(" · ");
}

export function convertCurrencyAmount(
  value: number,
  currencyKey: string,
  baseCurrency: string,
  rates: Record<string, number>
): number | null {
  if (!Number.isFinite(value)) return 0;
  if (currencyKey === baseCurrency) return value;

  const rate = Number(rates[currencyKey]);
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return value * rate;
}

export function summarizeConvertedField(
  groups: AssetCurrencySummary[],
  field: keyof Pick<
    AssetCurrencySummary,
    "monthly" | "annualized" | "remaining" | "renewal7d" | "renewal30d"
  >,
  baseCurrency: string,
  rates: Record<string, number>
): AssetConvertedSummary {
  const missingCurrencies = new Set<string>();

  const value = groups.reduce((total, group) => {
    const converted = convertCurrencyAmount(
      group[field],
      group.key,
      baseCurrency,
      rates
    );
    if (converted === null) {
      missingCurrencies.add(group.key);
      return total;
    }
    return total + converted;
  }, 0);

  return {
    value,
    missingCurrencies: Array.from(missingCurrencies),
  };
}
