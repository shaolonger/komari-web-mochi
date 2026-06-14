import { Callout, Flex, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import NodeDisplay from "../components/NodeDisplay";
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import Loading from "@/components/loading";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import StatusBar, { type StatusCardsVisibility } from "@/components/StatusBar";
import HomeAssetOverview from "@/components/HomeAssetOverview";
import { usePingSummaryMap } from "@/hooks/usePingSummaryMap";
import "@/components/StatusBar.css";


const Index = () => {
  const InnerLayout = () => {
    const { live_data } = useLiveData();
    //document.title = t("home_title");
    //#region 节点数据
    const { nodeList, isLoading, error } = useNodeList();
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    // Update time every second
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    // Status cards visibility state
    const [statusCardsVisibility, setStatusCardsVisibility] = useLocalStorage<StatusCardsVisibility>('statusCardsVisibility', {
      currentTime: true,
      currentOnline: true,
      regionOverview: true,
      trafficOverview: true,
      networkSpeed: true
    });
    
    // Calculate totals for the status bar - 必须在所有条件返回之前
    // 不使用 useMemo 以确保每次数据更新都重新计算
    let uploadTotal = 0;
    let downloadTotal = 0;
    
    if (live_data?.data?.data) {
      const values = Object.values(live_data.data.data);
      uploadTotal = values.reduce((acc, node) => acc + (node.network?.totalUp || 0), 0);
      downloadTotal = values.reduce((acc, node) => acc + (node.network?.totalDown || 0), 0);
    }

    const pingSummaryMap = usePingSummaryMap(nodeList, 1);
    
    if (isLoading) {
      return <Loading />;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }
    //#endregion

    const uploadSpeed = live_data?.data?.data
      ? Object.values(live_data.data.data).reduce(
          (acc, node) => acc + (node.network.up || 0),
          0
        )
      : 0;
    
    const downloadSpeed = live_data?.data?.data
      ? Object.values(live_data.data.data).reduce(
          (acc, node) => acc + (node.network.down || 0),
          0
        )
      : 0;
    
    const regionCount = nodeList
      ? Object.entries(
          nodeList.reduce((acc, item) => {
            acc[item.region] = (acc[item.region] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).length
      : 0;

    return (
      <>
        <Callouts />
        <StatusBar
          currentTime={currentTime}
          onlineCount={live_data?.data?.online.length ?? 0}
          totalCount={nodeList?.length ?? 0}
          regionCount={regionCount}
          uploadTotal={uploadTotal}
          downloadTotal={downloadTotal}
          uploadSpeed={uploadSpeed}
          downloadSpeed={downloadSpeed}
          statusCardsVisibility={statusCardsVisibility}
          onVisibilityChange={setStatusCardsVisibility}
        />
        <HomeAssetOverview
          nodes={nodeList ?? []}
          liveData={live_data?.data ?? { online: [], data: {} }}
          pingSummaryMap={pingSummaryMap}
        />
        <div id="node-display">
          <NodeDisplay
            nodes={nodeList ?? []}
            liveData={live_data?.data ?? { online: [], data: {} }}
            pingSummaryMap={pingSummaryMap}
            forceShowTrafficText={statusCardsVisibility.forceShowTrafficText}
          />
        </div>
      </>
    );
  };
  return <InnerLayout />;
};

//#region Callouts
const Callouts = () => {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  const ishttps = window.location.protocol === "https:";
  return (
    <Flex direction="column" gap="2" className="m-2">
      <Callout.Root m="2" hidden={ishttps} color="red">
        <Callout.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
            />
          </svg>
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            {t("warn_https")}
          </Text>
        </Callout.Text>
      </Callout.Root>
      <Callout.Root m="2" hidden={showCallout} id="callout" color="tomato">
        <Callout.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M21.707 3.707a1 1 0 0 0-1.414-1.414L18.496 4.09a4.25 4.25 0 0 0-5.251.604l-1.068 1.069a1.75 1.75 0 0 0 0 2.474l3.585 3.586a1.75 1.75 0 0 0 2.475 0l1.068-1.068a4.25 4.25 0 0 0 .605-5.25zm-11 8a1 1 0 0 0-1.414-1.414l-1.47 1.47l-.293-.293a.75.75 0 0 0-1.06 0l-1.775 1.775a4.25 4.25 0 0 0-.605 5.25l-1.797 1.798a1 1 0 1 0 1.414 1.414l1.798-1.797a4.25 4.25 0 0 0 5.25-.605l1.775-1.775a.75.75 0 0 0 0-1.06l-.293-.293l1.47-1.47a1 1 0 0 0-1.414-1.414l-1.47 1.47l-1.586-1.586z"
            />
          </svg>
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            {t("warn_websocket")}
          </Text>
        </Callout.Text>
      </Callout.Root>
    </Flex>
  );
};
// #endregion Callouts
export default Index;
