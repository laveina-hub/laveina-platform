"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { OTP_LENGTH } from "@/constants/app";
import { cn } from "@/lib/utils";

interface OtpCodeInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpCodeInput({ value, onChange, disabled, hasError }: OtpCodeInputProps) {
  const tCommon = useTranslations("common");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, inputValue: string) {
    if (!/^\d*$/.test(inputValue)) return;

    const newOtp = [...value];
    newOtp[index] = inputValue.slice(-1);
    onChange(newOtp);

    if (inputValue && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...value];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    onChange(newOtp);

    const nextEmpty = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextEmpty]?.focus();
  }

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          aria-label={tCommon("otpDigit", { index: index + 1, total: OTP_LENGTH })}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={cn(
            "font-body size-14 rounded-xl border-2 text-center text-2xl font-semibold transition-colors",
            "focus:border-primary-500 focus:ring-primary-100 focus:ring-2 focus:outline-none",
            hasError ? "border-error-300 bg-error-50" : "border-border-default bg-white"
          )}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
