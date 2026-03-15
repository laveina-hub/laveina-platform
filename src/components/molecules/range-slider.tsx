"use client";

import { useId } from "react";

import { ArrowIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  /** Current value. */
  value: number;
  /** Callback when value changes. */
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Unit suffix displayed next to the value (e.g. "kg"). */
  unit?: string;
  /** Accessible label for the hidden native range input. */
  ariaLabel: string;
  /** Accessible label for the decrease button. */
  decreaseLabel?: string;
  /** Accessible label for the increase button. */
  increaseLabel?: string;
  className?: string;
}

/** Custom range slider with a floating thumb that shows the current value and +/- arrow buttons. */
function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  ariaLabel,
  decreaseLabel = "Decrease",
  increaseLabel = "Increase",
  className,
}: RangeSliderProps) {
  const sliderId = useId();

  const decrease = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))));
  const increase = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))));

  const pct = ((value - min) / (max - min)) * 100;
  // Thumb is w-36 = 144px. Offset so the track fill aligns with the thumb center.
  const thumbW = 144;

  return (
    <div className={cn("flex-1 rounded-4xl border px-6 py-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex flex-1 items-center" style={{ height: "28px" }}>
          {/* Track background */}
          <div className="bg-secondary-50 absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full">
            <div
              className="bg-secondary-50 h-full rounded-full transition-none"
              style={{
                width: `calc(${pct}% - ${(pct / 100) * thumbW}px + ${thumbW / 2}px)`,
              }}
            />
          </div>

          {/* Floating thumb */}
          <div
            className="absolute top-1/2 z-10 -translate-y-1/2"
            style={{
              left: `calc(${pct}% - ${(pct / 100) * thumbW}px)`,
            }}
          >
            <div className="ring-primary-200 flex w-36 items-center justify-between gap-0.5 rounded-3xl bg-white px-4 py-1.5 shadow-sm ring-1">
              <button
                type="button"
                onClick={decrease}
                aria-label={decreaseLabel}
                tabIndex={-1}
                className="text-text-muted hover:text-primary-500 flex h-5 w-4 items-center justify-center text-xs transition-colors focus:outline-none"
              >
                <ArrowIcon direction="left" size={10} />
              </button>
              <span className="text-text-primary min-w-10 text-center text-xl font-medium">
                {value} {unit}
              </span>
              <button
                type="button"
                onClick={increase}
                aria-label={increaseLabel}
                tabIndex={-1}
                className="text-text-muted hover:text-primary-500 flex h-5 w-4 items-center justify-center text-xs transition-colors focus:outline-none"
              >
                <ArrowIcon direction="right" size={10} />
              </button>
            </div>
          </div>

          {/* Hidden native range for accessibility and drag support */}
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            aria-label={ariaLabel}
            className="absolute inset-x-0 top-1/2 z-0 h-6 w-full -translate-y-1/2 cursor-grab appearance-none bg-transparent opacity-0 active:cursor-grabbing"
          />
        </div>
      </div>
    </div>
  );
}

export { RangeSlider, type RangeSliderProps };
