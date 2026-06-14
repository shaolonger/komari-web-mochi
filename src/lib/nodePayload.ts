import type { NodeBasicInfo } from "../contexts/NodeListContext.tsx";

export function mapNodePayloadToBasicInfo(payload: Record<string, unknown>): NodeBasicInfo {
  return {
    uuid: String(payload.uuid ?? ""),
    name: String(payload.name ?? ""),
    cpu_name: String(payload.cpu_name ?? ""),
    virtualization: String(payload.virtualization ?? ""),
    arch: String(payload.arch ?? ""),
    cpu_cores: Number(payload.cpu_cores ?? 0),
    os: String(payload.os ?? ""),
    kernel_version: String(payload.kernel_version ?? ""),
    gpu_name: String(payload.gpu_name ?? ""),
    region: String(payload.region ?? ""),
    mem_total: Number(payload.mem_total ?? 0),
    swap_total: Number(payload.swap_total ?? 0),
    disk_total: Number(payload.disk_total ?? 0),
    version: String(payload.version ?? ""),
    weight: Number(payload.weight ?? 0),
    price: Number(payload.price ?? 0),
    tags: String(payload.tags ?? ""),
    billing_cycle: Number(payload.billing_cycle ?? 0),
    auto_renewal: Boolean(payload.auto_renewal ?? false),
    currency: String(payload.currency ?? ""),
    currency_code:
      payload.currency_code === undefined
        ? ""
        : String(payload.currency_code),
    provider: payload.provider === undefined ? "" : String(payload.provider),
    business_role:
      payload.business_role === undefined
        ? ""
        : String(payload.business_role),
    asset_ignored: Boolean(payload.asset_ignored ?? false),
    public_remark:
      payload.public_remark === undefined
        ? ""
        : String(payload.public_remark),
    capability_ping: Boolean(payload.capability_ping ?? false),
    capability_terminal: Boolean(payload.capability_terminal ?? false),
    capability_remote_exec: Boolean(payload.capability_remote_exec ?? false),
    capability_remote_control: Boolean(
      payload.capability_remote_control ?? false,
    ),
    capability_gpu: Boolean(payload.capability_gpu ?? false),
    capability_auto_update: Boolean(payload.capability_auto_update ?? false),
    capability_private_ping_targets: Boolean(
      payload.capability_private_ping_targets ?? false,
    ),
    group: String(payload.group ?? ""),
    traffic_limit: Number(payload.traffic_limit ?? 0),
    traffic_limit_type:
      payload.traffic_limit_type === undefined
        ? undefined
        : (String(payload.traffic_limit_type) as NodeBasicInfo["traffic_limit_type"]),
    expired_at: String(payload.expired_at ?? ""),
    created_at: String(payload.created_at ?? ""),
    updated_at: String(payload.updated_at ?? ""),
  };
}
