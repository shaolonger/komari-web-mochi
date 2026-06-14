import assert from "node:assert/strict";

import {
  getAnnualizedCost,
  getMonthlyCost,
  getRemainingValue,
  getRenewalExposure,
  groupAssetFinancials,
  summarizeConvertedField,
  type AssetBillingLike,
} from "../src/utils/assetMetrics.ts";

const NOW = new Date("2026-06-13T12:00:00.000Z");

type AuditSection = "math";

const auditSection = (process.argv[2] as AuditSection | undefined) ?? "math";

function assertApprox(
  actual: number,
  expected: number,
  epsilon: number,
  label: string,
) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function runMathAudit() {
  const assets: AssetBillingLike[] = [
    {
      price: 8.5,
      billing_cycle: 30,
      currency: "$",
      currency_code: "USD",
      expired_at: "2026-07-11T12:00:00.000Z",
      provider: "CloudSilk",
    },
    {
      price: 49.9,
      billing_cycle: 365,
      currency: "$",
      currency_code: "USD",
      expired_at: "2026-06-18T12:00:00.000Z",
      provider: "RackNerd",
    },
    {
      price: 35,
      billing_cycle: 30,
      currency: "¥",
      currency_code: "CNY",
      expired_at: "2026-07-28T12:00:00.000Z",
      asset_ignored: true,
      provider: "SaltyFish",
    },
    {
      price: 20,
      billing_cycle: 30,
      currency: "€",
      currency_code: "EUR",
      expired_at: "2026-08-12T12:00:00.000Z",
      provider: "FallbackGroup",
    },
  ];

  assertApprox(getMonthlyCost(8.5, 30), 8.5, 0.000001, "monthly: node-1");
  assertApprox(
    getMonthlyCost(49.9, 365),
    4.101369863013699,
    0.000001,
    "monthly: node-2",
  );
  assertApprox(getAnnualizedCost(20, 30), 240, 0.000001, "annualized");
  assertApprox(
    getRemainingValue(assets[0], NOW),
    7.933333333333334,
    0.000001,
    "remaining: node-1",
  );
  assertApprox(
    getRemainingValue(assets[1], NOW),
    0.6835616438356165,
    0.000001,
    "remaining: node-2",
  );

  const included = assets.filter((asset) => !asset.asset_ignored);
  const grouped = groupAssetFinancials(assets, NOW);

  assert.equal(grouped.length, 2, "ignored assets should be excluded from grouping");
  assertApprox(
    included.reduce(
      (total, asset) => total + getMonthlyCost(asset.price, asset.billing_cycle),
      0,
    ),
    32.6013698630137,
    0.000001,
    "portfolio monthly spend",
  );
  assertApprox(
    included.reduce(
      (total, asset) =>
        total + getAnnualizedCost(asset.price, asset.billing_cycle),
      0,
    ),
    391.2164383561644,
    0.000001,
    "portfolio annualized spend",
  );
  assertApprox(
    getRenewalExposure(assets, 7, NOW),
    49.9,
    0.000001,
    "renewal exposure 7d",
  );
  assertApprox(
    getRenewalExposure(assets, 30, NOW),
    58.4,
    0.000001,
    "renewal exposure 30d",
  );

  const convertedMonthly = summarizeConvertedField(grouped, "monthly", "USD", {
    USD: 1,
    EUR: 1.12,
  });
  assert.deepEqual(
    convertedMonthly.missingCurrencies,
    [],
    "converted monthly summary should have all visible rates",
  );
  assertApprox(
    convertedMonthly.value,
    35.0013698630137,
    0.000001,
    "normalized monthly spend",
  );

  const missingRateSummary = summarizeConvertedField(
    grouped,
    "remaining",
    "USD",
    { USD: 1 },
  );
  assert.deepEqual(
    missingRateSummary.missingCurrencies,
    ["EUR"],
    "missing-rate summary should flag EUR",
  );

  console.log("asset-release-audit: math checks passed");
}

switch (auditSection) {
  case "math":
    runMathAudit();
    break;
  default:
    throw new Error(`Unknown audit section: ${auditSection}`);
}
