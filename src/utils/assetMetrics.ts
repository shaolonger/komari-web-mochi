import type { TFunction } from "i18next";

export interface AssetBillingLike {
  price?: number | null;
  billing_cycle?: number | null;
  currency?: string | null;
  expired_at?: string | number | Date | null;
}

export interface AssetExpiryInfo {
  color: "red" | "orange" | "green";
  text: string;
  daysRemaining: number;
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
