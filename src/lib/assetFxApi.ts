export interface AssetFxSnapshot {
  base_code: string;
  source: string;
  updated_at: string;
  rates: Record<string, number>;
  stale: boolean;
  error?: string;
}

export async function getAssetFxSnapshot(): Promise<AssetFxSnapshot> {
  const response = await fetch("/api/public/asset-fx");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload?.message || `Request failed with ${response.status}`,
    );
  }
  return payload.data as AssetFxSnapshot;
}
