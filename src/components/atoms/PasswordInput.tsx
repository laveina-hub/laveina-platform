"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const inputStyles =
  "border-border-default text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-primary-400/20 w-full rounded-lg border bg-white px-4 py-3 pr-12 text-base transition-colors focus:ring-2 focus:outline-none sm:text-base";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  hasError?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      showPasswordLabel = "Show password",
      hidePasswordLabel = "Hide password",
      hasError,
      className,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            inputStyles,
            hasError && "border-error focus:border-error focus:ring-error/20",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-text-muted hover:text-text-primary focus-visible:ring-primary-400 absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 transition-colors focus:outline-none focus-visible:ring-2"
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput, type PasswordInputProps };
