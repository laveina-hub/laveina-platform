"use client";

import { forwardRef, useCallback, useRef, type KeyboardEvent, type ClipboardEvent } from "react";

import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

const OtpInput = forwardRef<HTMLDivElement, OtpInputProps>(
  ({ length = 6, value, onChange, hasError, disabled }, ref) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const focusInput = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, length - 1));
        inputRefs.current[clamped]?.focus();
      },
      [length]
    );

    function handleChange(index: number, char: string) {
      if (!/^\d?$/.test(char)) return;

      const chars = value.split("");
      chars[index] = char;
      const next = chars.join("").slice(0, length);
      onChange(next);

      if (char && index < length - 1) {
        focusInput(index + 1);
      }
    }

    function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (value[index]) {
          handleChange(index, "");
        } else if (index > 0) {
          handleChange(index - 1, "");
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusInput(index - 1);
      } else if (e.key === "ArrowRight" && index < length - 1) {
        focusInput(index + 1);
      }
    }

    function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted) {
        onChange(pasted);
        focusInput(pasted.length - 1);
      }
    }

    return (
      <div ref={ref} className="flex items-center justify-center gap-3 px-2 py-1 sm:gap-7">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ""}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-[54px] w-[52px] rounded-lg border text-center text-xl font-semibold text-[#242424] transition-all duration-150",
              "focus:border-primary-400 focus:ring-primary-400/20 focus:ring-2 focus:outline-none",
              "disabled:opacity-50",
              hasError ? "border-error focus:border-error focus:ring-error/20" : "border-[#dadada]"
            )}
          />
        ))}
      </div>
    );
  }
);

OtpInput.displayName = "OtpInput";

export { OtpInput, type OtpInputProps };
