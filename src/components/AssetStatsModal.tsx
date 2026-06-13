import React from "react";
import { Badge, Button, Dialog, Flex, Separator, Text } from "@radix-ui/themes";

interface ProviderBreakdownItem {
  name: string;
  count: number;
  monthlyCost: string;
  remainingValue: string;
  riskCount: number;
}

interface AssetStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAssets: number;
  ignoredAssets: number;
  billableAssets: number;
  highRiskAssets: number;
  monthlySpend: string;
  annualizedSpend: string;
  remainingValue: string;
  renewal7d: string;
  renewal30d: string;
  providerBreakdown: ProviderBreakdownItem[];
  currencyBreakdown: Array<{
    label: string;
    count: number;
    monthly: string;
    annualized: string;
    remaining: string;
  }>;
}

const StatRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Flex align="center" justify="between" gap="4">
    <Text size="2" color="gray">
      {label}
    </Text>
    <Text size="3" weight="bold">
      {value}
    </Text>
  </Flex>
);

const AssetStatsModal: React.FC<AssetStatsModalProps> = ({
  open,
  onOpenChange,
  totalAssets,
  ignoredAssets,
  billableAssets,
  highRiskAssets,
  monthlySpend,
  annualizedSpend,
  remainingValue,
  renewal7d,
  renewal30d,
  providerBreakdown,
  currencyBreakdown,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 720, maxHeight: "85vh", overflowY: "auto" }}>
        <Dialog.Title>Asset Statistics</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          A quick cost and risk overview of the currently filtered assets.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2">
            <StatRow label="Assets" value={totalAssets} />
            <StatRow label="Billable assets" value={billableAssets} />
            <StatRow label="Ignored assets" value={ignoredAssets} />
            <StatRow label="High-risk assets" value={highRiskAssets} />
            <StatRow label="Monthly spend" value={monthlySpend} />
            <StatRow label="Annualized spend" value={annualizedSpend} />
            <StatRow label="Remaining value" value={remainingValue} />
            <StatRow label="7-day renewal exposure" value={renewal7d} />
            <StatRow label="30-day renewal exposure" value={renewal30d} />
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="3">
            <Text size="3" weight="bold">
              Provider Breakdown
            </Text>
            {providerBreakdown.length === 0 ? (
              <Text size="2" color="gray">
                No provider metadata is available yet.
              </Text>
            ) : (
              <Flex direction="column" gap="2">
                {providerBreakdown.map((item) => (
                  <Flex
                    key={item.name}
                    align="center"
                    justify="between"
                    gap="4"
                    className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] px-3 py-2"
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {item.name}
                      </Text>
                      <Text size="1" color="gray">
                        {item.count} assets
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2" wrap="wrap" justify="end">
                      <Badge variant="soft" color="iris">
                        {item.monthlyCost}/mo
                      </Badge>
                      <Badge variant="soft" color="green">
                        {item.remainingValue}
                      </Badge>
                      {item.riskCount > 0 && (
                        <Badge variant="soft" color="red">
                          {item.riskCount} risk
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            )}
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="3">
            <Text size="3" weight="bold">
              Currency Buckets
            </Text>
            <Text size="1" color="gray">
              Exchange-rate conversion is not applied in this MVP yet. Mixed currencies are shown in native buckets.
            </Text>
            <Flex direction="column" gap="2">
              {currencyBreakdown.map((item) => (
                <Flex
                  key={item.label}
                  align="center"
                  justify="between"
                  gap="4"
                  className="rounded-lg border border-[var(--accent-4)] bg-[var(--accent-2)] px-3 py-2"
                >
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="bold">
                      {item.label}
                    </Text>
                    <Text size="1" color="gray">
                      {item.count} assets
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2" wrap="wrap" justify="end">
                    <Badge variant="soft" color="iris">
                      {item.monthly}/mo
                    </Badge>
                    <Badge variant="soft" color="blue">
                      {item.annualized}/yr
                    </Badge>
                    <Badge variant="soft" color="green">
                      {item.remaining}
                    </Badge>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          </Flex>

          <Flex justify="end">
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default AssetStatsModal;
