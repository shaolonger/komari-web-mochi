import React, { useMemo } from "react";
import { Flex, Text, Badge, Tooltip } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { Server, AlertTriangle } from "lucide-react";
import Flag from "./Flag";
import CustomTags from "./CustomTags";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { formatAssetPriceTag, getAssetExpiryInfo } from "@/utils/assetMetrics";
import { getOSImage, getOSName } from "@/utils";
import "./NodeModernCard.css";

interface ModernCardStaticProps {
  basic: NodeBasicInfo;
  online?: boolean;
  errorMessage?: string;
  children?: React.ReactNode;
}

const ModernCardStaticComponent: React.FC<ModernCardStaticProps> = ({ 
  basic,
  online = false,
  errorMessage,
  children 
}) => {
  const { t } = useTranslation();

  // 缓存价格标签计算
  const priceTag = useMemo(() => {
    return formatAssetPriceTag(basic, t);
  }, [basic, t]);

  // 缓存到期时间计算
  const expiryInfo = useMemo(() => {
    return getAssetExpiryInfo(basic, t);
  }, [basic, t]);


  // 缓存标签缩放策略 - 只计算价格和到期时间
  const tagScaleStrategyMobile = useMemo(() => {
    const totalLength = priceTag.length + 
                      (expiryInfo ? expiryInfo.text.length : 0);
    
    if (totalLength > 25) return { scale: 0.7, fontSize: 'text-[8px]', padding: 'px-1 py-0' };
    if (totalLength > 20) return { scale: 0.75, fontSize: 'text-[8px]', padding: 'px-1 py-0' };
    if (totalLength > 15) return { scale: 0.85, fontSize: 'text-[9px]', padding: 'px-1 py-0' };
    if (totalLength > 10) return { scale: 0.9, fontSize: 'text-[9px]', padding: 'px-1 py-0' };
    return { scale: 1, fontSize: 'text-[9px]', padding: 'px-1 py-0' };
  }, [priceTag, expiryInfo]);

  const tagScaleStrategyDesktop = useMemo(() => {
    // 统一缩放到0.75
    return { scale: 0.75, fontSize: 'text-[11px]', padding: 'px-1 py-0.5' };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* 装饰性背景 - 使用伪元素或overflow hidden确保不影响布局 */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none select-none"
        style={{ 
          zIndex: 0,
          userSelect: 'none'
        }}
        aria-hidden="true"
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <Server size={128} />
        </div>
      </div>

      {/* 主体内容 - 确保在背景之上，不受背景影响 */}
      <Flex direction="column" gap="3" className="p-3 sm:p-4 relative" style={{ zIndex: 1 }}>
        {/* 头部信息 - 桌面端保持原样，移动端垂直布局 */}
        <div className="block sm:hidden">
          {/* 移动端布局 */}
          <Flex direction="column" gap="1">
            {/* 第一行：旗帜、服务器名称、错误消息 */}
            <Flex align="center" className="min-w-0">
              <div className="relative flex-shrink-0 flex items-center mr-2">
                <Flag flag={basic.region} />
              </div>
              
              {/* 服务器名称 */}
              <Flex align="center" gap="1" className="flex-1 min-w-0">
                <Text size="2" weight="bold" className="text-accent-12 whitespace-nowrap flex-shrink-0">
                  {basic.name}
                </Text>
              </Flex>
              
              {/* 错误消息 */}
              {errorMessage && (
                <Tooltip content={errorMessage}>
                  <Badge color="red" variant="soft" size="1" className="flex-shrink-0 ml-auto">
                    <AlertTriangle size={10} />
                  </Badge>
                </Tooltip>
              )}
            </Flex>
            
            {/* 第二行：所有标签（自定义标签、价格、到期时间） */}
            {(basic.tags || priceTag || expiryInfo) && (
              <div 
                className="flex items-center gap-0.5 ml-7 min-h-[20px] modern-tags-mobile-wrap"
                style={{
                  transform: `scale(${tagScaleStrategyMobile.scale})`,
                  transformOrigin: 'left center',
                  // 默认不换行，通过CSS媒体查询在<940px时允许换行
                  width: `calc((100% - 1.75rem) / ${tagScaleStrategyMobile.scale})`,  // 减去左边距后补偿缩放
                  marginRight: '0.5rem'  // 右侧边距
                }}
              >
                {/* 自定义标签 */}
                {basic.tags && (
                  <CustomTags 
                    tags={basic.tags}
                    scale={1}
                    fontSize={tagScaleStrategyMobile.fontSize}
                    padding={tagScaleStrategyMobile.padding}
                  />
                )}
                
                {/* 价格标签 */}
                {priceTag && (
                  <Badge 
                    color="iris" 
                    variant="soft"
                    size="1"
                    className={`${tagScaleStrategyMobile.fontSize} ${tagScaleStrategyMobile.padding} whitespace-nowrap`}
                    style={{ lineHeight: '1.2' }}
                  >
                    {priceTag}
                  </Badge>
                )}
                
                {/* 到期时间标签 */}
                {expiryInfo && (
                  <Badge
                    color={expiryInfo.color}
                    variant="soft"
                    size="1"
                    className={`${tagScaleStrategyMobile.fontSize} ${tagScaleStrategyMobile.padding} whitespace-nowrap`}
                    style={{ lineHeight: '1.2' }}
                  >
                    {expiryInfo.text}
                  </Badge>
                )}
              </div>
            )}
            {!(basic.tags || priceTag || expiryInfo) && (
              <div className="min-h-[20px]" />
            )}
            
            {/* 第三行：系统信息 */}
            <Flex gap="1" align="center" className="min-w-0 ml-7">
              {online && (
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
              )}
              <img
                src={getOSImage(basic.os)}
                alt={basic.os}
                className="w-3 h-3 opacity-70 flex-shrink-0"
              />
              <Text size="1" color="gray" className="whitespace-nowrap text-[11px]">
                {getOSName(basic.os)} • {basic.arch}
                {basic.virtualization && ` • ${basic.virtualization}`}
              </Text>
            </Flex>
          </Flex>
        </div>
        
        {/* 桌面端布局 */}
        <div className="hidden sm:block">
          <Flex direction="column" gap="2">
            {/* 第一行：旗帜、服务器名称、错误消息 */}
            <Flex align="center" className="min-w-0">
              <div className="relative flex-shrink-0 flex items-center mr-3">
                <Flag flag={basic.region} />
              </div>
              
              {/* 服务器名称 */}
              <Flex align="center" gap="2" className="flex-1 min-w-0">
                <Text size="3" weight="bold" className="text-accent-12 whitespace-nowrap flex-shrink-0">
                  {basic.name}
                </Text>
              </Flex>
              
              {/* 错误消息 */}
              {errorMessage && (
                <Tooltip content={errorMessage}>
                  <Badge color="red" variant="soft" size="1" className="flex-shrink-0 ml-auto">
                    <AlertTriangle size={12} />
                  </Badge>
                </Tooltip>
              )}
            </Flex>
            
            {/* 第二行：所有标签（自定义标签、价格、到期时间） */}
            {(basic.tags || priceTag || expiryInfo) && (
              <div 
                className="flex items-center gap-1 ml-10 min-h-[24px] overflow-hidden whitespace-nowrap"
                style={{
                  transform: `scale(${tagScaleStrategyDesktop.scale})`,
                  transformOrigin: 'left center',
                  // 补偿缩放对宽度的影响，防止换行
                  width: `calc((100% - 2.5rem) / ${tagScaleStrategyDesktop.scale})`,  // 减去左边距后补偿缩放
                  maxWidth: `calc((100% - 2.5rem) / ${tagScaleStrategyDesktop.scale})`,
                  marginRight: '0.5rem'  // 右侧边距
                }}
              >
                {/* 自定义标签 */}
                {basic.tags && (
                  <CustomTags 
                    tags={basic.tags}
                    scale={1}
                    fontSize={tagScaleStrategyDesktop.fontSize}
                    padding={tagScaleStrategyDesktop.padding}
                  />
                )}
                
                {/* 价格标签 */}
                {priceTag && (
                  <Badge 
                    color="iris" 
                    variant="soft"
                    size="1"
                    className={`${tagScaleStrategyDesktop.fontSize} ${tagScaleStrategyDesktop.padding} whitespace-nowrap`}
                    style={{ lineHeight: '1.2' }}
                  >
                    {priceTag}
                  </Badge>
                )}
                
                {/* 到期时间标签 */}
                {expiryInfo && (
                  <Badge
                    color={expiryInfo.color}
                    variant="soft"
                    size="1"
                    className={`${tagScaleStrategyDesktop.fontSize} ${tagScaleStrategyDesktop.padding} whitespace-nowrap`}
                    style={{ lineHeight: '1.2' }}
                  >
                    {expiryInfo.text}
                  </Badge>
                )}
              </div>
            )}
            {!(basic.tags || priceTag || expiryInfo) && (
              <div className="min-h-[24px]" />
            )}
            
            {/* 第三行：系统信息 */}
            <Flex gap="2" align="center" className="min-w-0 ml-10">
              {online && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              )}
              <img
                src={getOSImage(basic.os)}
                alt={basic.os}
                className="w-4 h-4 opacity-70 flex-shrink-0"
              />
              <Text size="1" color="gray" className="whitespace-nowrap">
                {getOSName(basic.os)} • {basic.arch}
                {basic.virtualization && ` • ${basic.virtualization}`}
              </Text>
            </Flex>
          </Flex>
        </div>

        {/* 动态内容插槽 */}
        {children}
      </Flex>
    </div>
  );
};

// 静态内容很少变化，但现在包含在线状态和错误信息
export const ModernCardStatic = React.memo(ModernCardStaticComponent, (prev, next) => {
  // 只有这些属性变化时才重新渲染
  return (
    prev.basic.uuid === next.basic.uuid &&
    prev.basic.name === next.basic.name &&
    prev.basic.price === next.basic.price &&
    prev.basic.billing_cycle === next.basic.billing_cycle &&
    prev.basic.expired_at === next.basic.expired_at &&
    prev.basic.region === next.basic.region &&
    prev.basic.os === next.basic.os &&
    prev.basic.arch === next.basic.arch &&
    prev.basic.virtualization === next.basic.virtualization &&
    prev.online === next.online &&
    prev.errorMessage === next.errorMessage
  );
});
