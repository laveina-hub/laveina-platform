"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, CardBody, CardShell } from "@/components/atoms";
import { MapPinIcon, StarIcon } from "@/components/icons";
import { formatDateLong, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LOW_STAR_THRESHOLD,
  MIN_RATING_COMMENT_CHARS,
  RATING_EDIT_WINDOW_DAYS,
} from "@/validations/rating.schema";

// A11 (client answer 2026-04-21): customer can view + edit their ratings
// within 7 days of submission. Listing is server-fetched (see page.tsx);
// edits hit PATCH /api/ratings/[id] which re-enforces the 7-day window
// both server-side and via RLS.

export type RatingRow = {
  id: string;
  shipment_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  pickup_point_name: string;
  pickup_point_city: string | null;
};

type Props = {
  ratings: RatingRow[];
};

function isWithinEditWindow(createdAt: string): boolean {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return false;
  const windowMs = RATING_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdMs <= windowMs;
}

export function CustomerRatingsSection({ ratings }: Props) {
  const t = useTranslations("customerRatings");
  const locale = useLocale() as Locale;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<RatingRow[]>(ratings);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {rows.length === 0 ? (
        <CardShell>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <StarIcon className="text-text-muted" size={28} />
            <div>
              <p className="text-text-primary font-medium">{t("emptyTitle")}</p>
              <p className="text-text-muted text-sm">{t("emptySubtitle")}</p>
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <RatingCard
                row={row}
                locale={locale}
                isEditing={editingId === row.id}
                onStartEdit={() => setEditingId(row.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={(updated) => {
                  setRows((prev) =>
                    prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
                  );
                  setEditingId(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── card ───────────────────────────────────────────────────────────────────

type CardProps = {
  row: RatingRow;
  locale: Locale;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdated: (updated: { id: string; stars: number; comment: string | null }) => void;
};

function RatingCard({ row, locale, isEditing, onStartEdit, onCancelEdit, onUpdated }: CardProps) {
  const t = useTranslations("customerRatings");
  const canEdit = isWithinEditWindow(row.created_at);

  if (isEditing) {
    return <EditForm row={row} onCancel={onCancelEdit} onUpdated={onUpdated} />;
  }

  return (
    <CardShell>
      <CardBody className="px-5! py-4!">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon size={14} className="text-text-muted shrink-0" />
              <p className="text-text-primary truncate font-semibold">{row.pickup_point_name}</p>
              {row.pickup_point_city && (
                <span className="text-text-muted truncate text-xs">· {row.pickup_point_city}</span>
              )}
            </div>
            <p className="text-text-muted mt-1 text-xs">
              {t("submittedOn", { date: formatDateLong(row.created_at, locale) })}
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-text-muted hover:text-primary-600 focus-visible:outline-primary-500 flex h-7 w-7 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={t("editAria")}
            >
              <Pencil size={14} aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon
              key={i}
              size={16}
              filled={i < row.stars}
              className={cn(i < row.stars ? "text-amber-400" : "text-border-default")}
            />
          ))}
          <span className="sr-only">{t("starsLabel", { value: row.stars })}</span>
        </div>

        {row.comment && (
          <blockquote className="bg-bg-muted text-text-primary mt-3 rounded-lg px-3 py-2 text-sm italic">
            “{row.comment}”
          </blockquote>
        )}

        {!canEdit && (
          <p className="text-text-muted mt-2 text-xs italic">{t("editWindowExpired")}</p>
        )}
      </CardBody>
    </CardShell>
  );
}

// ── edit form ──────────────────────────────────────────────────────────────

type EditFormProps = {
  row: RatingRow;
  onCancel: () => void;
  onUpdated: (updated: { id: string; stars: number; comment: string | null }) => void;
};

function EditForm({ row, onCancel, onUpdated }: EditFormProps) {
  const t = useTranslations("customerRatings");
  const [stars, setStars] = useState(row.stars);
  const [comment, setComment] = useState(row.comment ?? "");
  const [saving, setSaving] = useState(false);

  const commentRequired = stars <= LOW_STAR_THRESHOLD;
  const commentTrimmed = comment.trim();
  const commentValid = !commentRequired || commentTrimmed.length >= MIN_RATING_COMMENT_CHARS;
  const canSave = stars > 0 && commentValid && !saving;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ratings/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: commentTrimmed || undefined }),
      });
      if (!res.ok) throw new Error("save failed");
      const json = await res.json();
      onUpdated({ id: row.id, stars: json.data.stars, comment: json.data.comment });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardShell>
      <CardBody className="px-5! py-5!">
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <div>
            <p className="text-text-primary text-sm font-semibold">{row.pickup_point_name}</p>
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => {
                const value = i + 1;
                const filled = value <= stars;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStars(value)}
                    aria-label={`${value}`}
                    className="p-0.5 focus:outline-none"
                  >
                    <StarIcon
                      size={22}
                      filled={filled}
                      className={cn(
                        "transition-colors",
                        filled ? "text-amber-400" : "text-border-default"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor={`rating-edit-${row.id}`}
              className="text-text-primary text-xs font-medium"
            >
              {commentRequired ? t("commentRequired") : t("commentOptional")}
            </label>
            <textarea
              id={`rating-edit-${row.id}`}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                commentRequired ? t("commentPlaceholderRequired") : t("commentPlaceholderOptional")
              }
              className={cn(
                "border-border-default text-text-primary placeholder:text-text-muted",
                "focus:border-primary-400 focus:ring-primary-400/20",
                "mt-1 w-full resize-none rounded-lg border bg-white px-3.5 py-2.5 text-sm",
                "focus:ring-2 focus:outline-none",
                commentRequired && !commentValid && "border-error"
              )}
            />
            {commentRequired && (
              <p
                className={cn(
                  "mt-1 text-right text-xs",
                  commentValid ? "text-text-muted" : "text-error"
                )}
              >
                {commentTrimmed.length} / {MIN_RATING_COMMENT_CHARS}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!canSave}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </CardBody>
    </CardShell>
  );
}
