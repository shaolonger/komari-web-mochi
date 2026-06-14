import { useEffect, useMemo, useState } from "react";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";

export interface PingSummaryTask {
  id: number;
  name: string;
  avg: number;
  loss: number;
  min: number;
  max: number;
}

export type PingSummaryMap = Record<string, PingSummaryTask[]>;

type PingApiTask = {
  id?: number;
  name?: string;
  avg?: number;
  loss?: number;
  min?: number;
  max?: number;
};

type PingApiResp = {
  data?: {
    tasks?: PingApiTask[];
  };
};

export function usePingSummaryMap(
  nodes: NodeBasicInfo[] | null | undefined,
  hours = 1
) {
  const [summaryMap, setSummaryMap] = useState<PingSummaryMap>({});
  const pingCapableNodes = useMemo(
    () => (nodes ?? []).filter((node) => node.capability_ping),
    [nodes]
  );

  useEffect(() => {
    if (pingCapableNodes.length === 0) {
      return;
    }

    let active = true;

    Promise.all(
      pingCapableNodes.map(async (node) => {
        try {
          const response = await fetch(
            `/api/records/ping?uuid=${node.uuid}&hours=${hours}`
          );
          const payload: PingApiResp = await response.json();
          const tasks = Array.isArray(payload?.data?.tasks)
            ? payload.data.tasks
                .filter((task) => typeof task?.id === "number")
                .map((task) => ({
                  id: task.id as number,
                  name: task.name || `Task ${task.id}`,
                  avg:
                    typeof task.avg === "number" && Number.isFinite(task.avg)
                      ? task.avg
                      : 0,
                  loss:
                    typeof task.loss === "number" && Number.isFinite(task.loss)
                      ? task.loss
                      : 0,
                  min:
                    typeof task.min === "number" && Number.isFinite(task.min)
                      ? task.min
                      : 0,
                  max:
                    typeof task.max === "number" && Number.isFinite(task.max)
                      ? task.max
                      : 0,
                }))
            : [];

          return [node.uuid, tasks] as const;
        } catch {
          return [node.uuid, []] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      setSummaryMap(
        Object.fromEntries(entries.filter(([, tasks]) => tasks.length > 0))
      );
    });

    return () => {
      active = false;
    };
  }, [hours, pingCapableNodes]);

  return pingCapableNodes.length === 0 ? {} : summaryMap;
}
