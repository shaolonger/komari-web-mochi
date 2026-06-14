import React from 'react';

export type NodeDetail = {
  uuid: string;
  token: string;
  name: string;
  cpu_name: string;
  virtualization: string;
  arch: string;
  cpu_cores: number;
  os: string;
  kernel_version: string;
  gpu_name: string;
  ipv4: string;
  ipv6: string;
  region: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  version: string;
  weight: number;
  price: number;
  remark: string | undefined;
  public_remark: string;
  auto_renewal?: boolean;
  currency?: string;
  currency_code?: string;
  provider?: string;
  business_role?: string;
  asset_ignored?: boolean;
  capability_ping?: boolean;
  capability_terminal?: boolean;
  capability_remote_exec?: boolean;
  capability_remote_control?: boolean;
  capability_gpu?: boolean;
  capability_auto_update?: boolean;
  capability_private_ping_targets?: boolean;
  group: string | undefined;
  billing_cycle: number;
  expired_at: string;
  created_at: string;
  updated_at: string;
  [key: string]: any; 
};

interface NodeDetailsContextType {
  nodeDetail: NodeDetail[] | [];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
const NodeDetailsContext = React.createContext<NodeDetailsContextType | undefined>(undefined);
export const NodeDetailsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodeDetail, setNodeDetail] = React.useState<NodeDetail[] | []>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = () => {
    fetch("/api/admin/client/list")
      .then((response) => response.json())
      .then((data: NodeDetail[]) => {
        setNodeDetail(data);
        setIsLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setIsLoading(false);
      });
  };
    React.useEffect(() => {
        setIsLoading(true);
        refresh();
    }, []);
  return (
    <NodeDetailsContext.Provider value={{ nodeDetail, isLoading, error, refresh }}>
      {children}
    </NodeDetailsContext.Provider>
  );
};

export const useNodeDetails = () => {
    const context = React.useContext(NodeDetailsContext);
    if (context === undefined) {
        throw new Error("useNodeDetails must be used within a NodeDetailsProvider");
    }
    return context;
};
