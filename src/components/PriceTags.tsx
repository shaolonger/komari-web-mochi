import { Badge, Flex } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import CustomTags from "./CustomTags";
import {
  formatAssetPriceTag,
  getAssetExpiryInfo,
} from "@/utils/assetMetrics";

const PriceTags = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
  auto_renewal,
  tags = "",
  ...props
}: {
  expired_at?: string | number;
  price?: number;
  billing_cycle?: number;
  currency?: string;
  auto_renewal?: boolean;
  tags?: string;
} & React.ComponentProps<typeof Flex>) => {
  const [t] = useTranslation();
  if (price == 0) {
    return (
      <Flex gap="1" {...props} wrap="wrap">
        <CustomTags tags={tags} />
      </Flex>
    );
  }
  const priceTag = formatAssetPriceTag(
    { price, billing_cycle, currency },
    t
  );
  const expiryInfo = getAssetExpiryInfo({ expired_at, price }, t);

  return (
    <Flex gap="1" {...props} wrap="wrap">
      {priceTag && (
        <Badge color="iris" size="1" variant="soft" className="text-sm">
          <label className="text-xs">{priceTag}</label>
        </Badge>
      )}
      {expiryInfo && (
        <Badge
          color={expiryInfo.color}
          size="1"
          variant="soft"
          className="text-sm"
        >
          <label className="text-xs">{expiryInfo.text}</label>
        </Badge>
      )}
      <Badge
        color={auto_renewal ? "green" : "amber"}
        size="1"
        variant="soft"
        className="text-sm"
      >
        <label className="text-xs">
          {auto_renewal
            ? t("asset.autoRenewal", { defaultValue: "Auto renew" })
            : t("asset.manualRenew", { defaultValue: "Manual renew" })}
        </label>
      </Badge>
      <CustomTags tags={tags} />
    </Flex>
  );
};


export default PriceTags;
