import React from "react";
import { 
  DropdownMenu, 
  IconButton, 
  Text, 
  Flex
} from "@radix-ui/themes";
import { 
  ChevronDown,
  Check
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ViewMode } from "./NodeDisplay";
import "./ViewModeSelector.css";

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isMobile?: boolean;
}

interface ModeOption {
  value: ViewMode;
  label: string;
  mobileSupported: boolean;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ 
  currentMode, 
  onModeChange,
  isMobile = false 
}) => {
  const { t } = useTranslation();

  const modeOptions: ModeOption[] = [
    {
      value: "modern",
      label: t("view.modern", { defaultValue: "Modern" }),
      mobileSupported: true
    },
    {
      value: "compact",
      label: t("view.compact", { defaultValue: "Compact" }),
      mobileSupported: true
    },
    {
      value: "classic",
      label: t("view.classic", { defaultValue: "Classic" }),
      mobileSupported: true
    },
    {
      value: "detailed",
      label: t("view.detailed", { defaultValue: "Detailed" }),
      mobileSupported: true
    },
    {
      value: "task",
      label: t("view.task", { defaultValue: "Task" }),
      mobileSupported: true
    },
    {
      value: "earth",
      label: t("view.earth", { defaultValue: "Earth" }),
      mobileSupported: true
    },
    {
      value: "asset",
      label: t("view.asset", { defaultValue: "Asset" }),
      mobileSupported: true
    }
  ];

  // 过滤移动端不支持的模式
  const availableOptions = isMobile 
    ? modeOptions.filter(option => option.mobileSupported)
    : modeOptions;

  // 获取当前模式的信息
  const currentOption = modeOptions.find(option => option.value === currentMode) || modeOptions[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton 
          variant="soft" 
          size="2"
          className={`view-mode-trigger gap-2 px-3 ${isMobile ? 'w-full' : ''}`}
          style={{ minWidth: isMobile ? "100%" : "140px" }}
        >
          <Flex align="center" justify="center" gap="2" className="w-full">
            <Text size="2" weight="medium">
              {currentOption.label}
            </Text>
            <ChevronDown size={16} className="view-mode-chevron" />
          </Flex>
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content 
        align={isMobile ? "center" : "end"}
        sideOffset={5}
        className={`view-mode-dropdown p-1 ${isMobile ? 'w-[90vw]' : 'min-w-[140px]'}`}
        style={{ zIndex: 9999 }}
      >
        {availableOptions.map((option) => (
          <DropdownMenu.Item
            key={option.value}
            onSelect={() => onModeChange(option.value)}
            className="view-mode-item cursor-pointer p-2 rounded-md transition-colors"
            data-selected={currentMode === option.value}
          >
            <Flex align="center" justify="between" className="w-full">
              <Text size="2" weight="medium" className="view-mode-text">
                {option.label}
              </Text>
              {currentMode === option.value && (
                <div className="view-mode-check-wrapper">
                  <Check size={14} className="view-mode-check" style={{ color: 'var(--accent-11)' }} />
                </div>
              )}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ViewModeSelector;
