export type AssetFocusFilterMode =
  | "all"
  | "high"
  | "medium"
  | "low"
  | "expiring"
  | "due_today"
  | "due_7d"
  | "due_30d"
  | "manual"
  | "ignored"
  | "metadata"
  | "underused"
  | "retain"
  | "observe"
  | "renew"
  | "reclaim"
  | "offline"
  | "traffic"
  | "network"
  | "stale";

export const ASSET_VIEW_MODE_EVENT = "komari:set-view-mode";
export const ASSET_FILTER_FOCUS_EVENT = "komari:focus-asset-filter";

const VIEW_MODE_STORAGE_KEY = "nodeViewMode";
const REQUESTED_FILTER_STORAGE_KEY = "assetViewRequestedFilter";

export function isAssetFocusFilterMode(
  value: unknown
): value is AssetFocusFilterMode {
  return [
    "all",
    "high",
    "medium",
    "low",
    "expiring",
    "due_today",
    "due_7d",
    "due_30d",
    "manual",
    "ignored",
    "metadata",
    "underused",
    "retain",
    "observe",
    "renew",
    "reclaim",
    "offline",
    "traffic",
    "network",
    "stale",
  ].includes(String(value));
}

function rememberRequestedAssetFilter(filter: AssetFocusFilterMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    REQUESTED_FILTER_STORAGE_KEY,
    JSON.stringify(filter)
  );
}

export function takeRequestedAssetFilter(): AssetFocusFilterMode | null {
  if (typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(REQUESTED_FILTER_STORAGE_KEY);
  if (!rawValue) return null;

  window.localStorage.removeItem(REQUESTED_FILTER_STORAGE_KEY);

  try {
    const parsed = JSON.parse(rawValue);
    return isAssetFocusFilterMode(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function focusAssetView(filter?: AssetFocusFilterMode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify("asset"));
  if (filter) {
    rememberRequestedAssetFilter(filter);
  }

  window.dispatchEvent(
    new CustomEvent(ASSET_VIEW_MODE_EVENT, {
      detail: { mode: "asset" },
    })
  );

  if (filter) {
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(ASSET_FILTER_FOCUS_EVENT, {
          detail: { filter },
        })
      );
    }, 80);
  }

  document.getElementById("node-display")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
