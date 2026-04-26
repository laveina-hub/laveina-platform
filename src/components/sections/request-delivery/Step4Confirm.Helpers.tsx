"use client";

import { Pencil } from "lucide-react";
import type { ComponentType } from "react";

import { MastercardIcon, StripeIcon, VisaIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// Sub-components for Step4Confirm — pulled out so the parent stays under the
// 250-line cap (DEVELOPER_GUIDE §3.5). Pure presentational, no business logic.

type InfoCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  editLabel?: string;
  onEdit?: () => void;
};

export function InfoCard({
  icon: Icon,
  title,
  subtitle,
  titleClassName,
  editLabel,
  onEdit,
}: InfoCardProps) {
  return (
    <div className="border-border-muted relative flex items-start gap-3 rounded-2xl border bg-white p-4">
      <div className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-text-primary truncate text-sm font-semibold", titleClassName)}>
          {title}
        </p>
        {subtitle && <p className="text-text-muted truncate text-xs">{subtitle}</p>}
      </div>
      {onEdit && editLabel && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="text-text-muted hover:text-primary-600 focus-visible:outline-primary-500 absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-primary font-medium">{label}</dt>
      <dd className="text-text-primary font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// Stripe / VISA / Mastercard only — PayPal was dropped per M2 client confirmation.
// StripeIcon ships with its own gray pill background built into its SVG; the
// other two marks are pure logos and get wrapped in a matching gray pill so the
// row reads as a uniform strip.

const BADGE_BASE =
  "inline-flex h-[28px] w-[44px] items-center justify-center rounded-[4px] border border-[#ECECEC] bg-[#F3F3F3]";

export function StripeBadge() {
  return <StripeIcon size={44} className="shrink-0" />;
}

export function VisaBadge() {
  return (
    <span className={BADGE_BASE}>
      <VisaIcon size={26} />
    </span>
  );
}

export function MastercardBadge() {
  return (
    <span className={BADGE_BASE}>
      <MastercardIcon size={26} />
    </span>
  );
}
