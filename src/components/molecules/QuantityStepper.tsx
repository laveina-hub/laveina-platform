import { useTranslations } from "next-intl";

import { MinusIcon, PlusIcon } from "@/components/icons";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  decreaseLabel?: string;
  increaseLabel?: string;
}

function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  decreaseLabel,
  increaseLabel,
}: QuantityStepperProps) {
  const tCommon = useTranslations("common");
  const resolvedDecreaseLabel = decreaseLabel ?? tCommon("decrease");
  const resolvedIncreaseLabel = increaseLabel ?? tCommon("increase");
  return (
    <div className="border-border-default flex w-fit items-center overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={resolvedDecreaseLabel}
        className="flex items-center justify-center p-1 transition-colors focus:outline-none"
      >
        <div className="text-text-muted hover:bg-primary-50 bg-secondary-50 rounded-md p-4">
          <MinusIcon size={14} />
        </div>
      </button>
      <span className="text-text-muted px-7 text-4xl font-medium">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={resolvedIncreaseLabel}
        className="flex items-center justify-center p-1 transition-colors focus:outline-none"
      >
        <div className="text-text-muted hover:bg-primary-50 bg-secondary-50 rounded-md p-4">
          <PlusIcon size={14} />
        </div>
      </button>
    </div>
  );
}

export { QuantityStepper, type QuantityStepperProps };
