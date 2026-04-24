"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, SectionContainer } from "@/components/atoms";
import { CheckIcon, ClockIcon, MapPinIcon, SendIcon, StarIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { formatDateLong, formatTime, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LOW_STAR_THRESHOLD,
  MIN_RATING_COMMENT_CHARS,
  RATING_EDIT_WINDOW_DAYS,
} from "@/validations/rating.schema";

// A11 (client answer 2026-04-21):
//   - Ratings publish immediately (no moderation queue)
//   - Comment required for ratings ≤ 3 stars (min 20 chars)
//   - Comment optional for 4–5 stars
//   - Customer can edit within 7 days of submission

type ExistingRating = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

type Props = {
  trackingId: string;
  shipmentId: string;
  originName: string;
  destinationName: string;
  deliveredAt: string;
  /** UNIQUE (shipment_id, customer_id) also enforces this at the DB layer. */
  canRate: boolean;
  /** If already rated, the existing row — enables 7-day edit mode. */
  existingRating?: ExistingRating | null;
  /** Q13.6 — when false, swap the bottom CTAs for a soft-register prompt. */
  isAuthenticated: boolean;
  /** Q13.6 — receiver email used to pre-fill the register form link. */
  receiverEmail?: string | null;
};

const STAR_COUNT = 5;

function isWithinEditWindow(createdAt: string): boolean {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return false;
  const windowMs = RATING_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdMs <= windowMs;
}

export function DeliveryConfirmationSection({
  trackingId,
  shipmentId,
  originName,
  destinationName,
  deliveredAt,
  canRate,
  existingRating,
  isAuthenticated,
  receiverEmail,
}: Props) {
  const t = useTranslations("deliveryConfirm");
  const locale = useLocale() as Locale;

  // Snapshot mode = already rated. Edit mode = user clicked "Edit rating"
  // inside the 7-day window. Skipped = user dismissed the rating prompt
  // without submitting; we hide the whole form locally and surface a small
  // "10% off your next shipment" incentive instead.
  const [snapshot, setSnapshot] = useState<ExistingRating | null>(existingRating ?? null);
  const [editing, setEditing] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const [stars, setStars] = useState<number>(snapshot?.stars ?? 0);
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [comment, setComment] = useState<string>(snapshot?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  const deliveredDate = formatDateLong(deliveredAt, locale);
  const deliveredTime = formatTime(deliveredAt, locale);

  const inSnapshotMode = snapshot !== null && !editing;
  const commentRequired = stars > 0 && stars <= LOW_STAR_THRESHOLD;
  const commentTrimmed = comment.trim();
  const commentValid = !commentRequired || commentTrimmed.length >= MIN_RATING_COMMENT_CHARS;
  const canSubmit = stars > 0 && commentValid && !submitting;

  const canShowEdit = snapshot !== null && isWithinEditWindow(snapshot.created_at);

  async function handleCreate() {
    if (!canSubmit || !canRate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id: shipmentId,
          tracking_id: trackingId,
          stars,
          comment: commentTrimmed || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSnapshot(json.data as ExistingRating);
      toast.success(t("ratingSubmitted"));
    } catch {
      setStars(snapshot?.stars ?? 0);
      toast.error(t("invalidLink"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!snapshot || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ratings/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          comment: commentTrimmed || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSnapshot({
        ...snapshot,
        stars: json.data.stars,
        comment: json.data.comment,
      });
      setEditing(false);
      toast.success(t("ratingUpdated"));
    } catch {
      toast.error(t("invalidLink"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartEdit() {
    if (!snapshot) return;
    setStars(snapshot.stars);
    setComment(snapshot.comment ?? "");
    setEditing(true);
  }

  function handleCancelEdit() {
    if (!snapshot) return;
    setStars(snapshot.stars);
    setComment(snapshot.comment ?? "");
    setEditing(false);
  }

  const displayStars = inSnapshotMode ? snapshot.stars : hoverStars || stars;

  const showRatingForm = (canRate || snapshot !== null) && !skipped;
  const showSkipIncentive = canRate && skipped && snapshot === null;

  return (
    <div className="bg-bg-secondary min-h-screen px-4 pt-10 pb-24 sm:px-6 lg:px-10">
      <SectionContainer>
        <div className="mx-auto flex max-w-lg flex-col">
          <section className="border-border-muted rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex justify-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span
                  aria-hidden
                  className="bg-success/20 absolute inset-0 animate-ping rounded-full"
                  style={{ animationDuration: "2s" }}
                />
                <span aria-hidden className="bg-success/15 absolute inset-2 rounded-full" />
                <div className="bg-success relative flex h-16 w-16 items-center justify-center rounded-full shadow-md">
                  <CheckIcon className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-text-primary text-xl font-bold sm:text-2xl">{t("title")}</h1>
              <p className="text-text-muted mx-auto mt-2 max-w-xs text-sm">{t("subtitle")}</p>
            </div>

            <div className="bg-bg-muted mt-6 rounded-xl p-4">
              <div className="relative flex items-start gap-3">
                <span
                  aria-hidden
                  className="border-border-default relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 bg-white"
                />
                <span
                  aria-hidden
                  className="border-border-default absolute top-4 left-1.25 h-4 border-l"
                />
                <p className="text-text-muted text-sm">{originName}</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <MapPinIcon className="text-primary-500 mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-text-primary text-sm font-semibold">{destinationName}</p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ClockIcon className="text-text-muted h-3.5 w-3.5 shrink-0" />
                <p className="text-text-muted text-xs">
                  {t("deliveredOn", { date: deliveredDate, time: deliveredTime })}
                </p>
              </div>
            </div>

            <div className="border-border-muted mt-6 rounded-xl border p-5">
              {showRatingForm && (
                <div className="flex flex-col gap-4">
                  <div className="text-center">
                    <p className="text-text-primary text-sm font-semibold">
                      {inSnapshotMode
                        ? t("ratingSubmittedTitle")
                        : editing
                          ? t("ratingEditTitle")
                          : t("ratingTitle")}
                    </p>
                    <StarRow
                      display={displayStars}
                      interactive={!inSnapshotMode}
                      disabled={submitting}
                      onHover={setHoverStars}
                      onClick={setStars}
                    />
                  </div>

                  {!inSnapshotMode && stars > 0 && (
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="rating-comment"
                        className="text-text-primary text-xs font-medium"
                      >
                        {commentRequired ? t("ratingCommentRequired") : t("ratingCommentOptional")}
                      </label>
                      <textarea
                        id="rating-comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          commentRequired
                            ? t("ratingCommentPlaceholderRequired")
                            : t("ratingCommentPlaceholderOptional")
                        }
                        className={cn(
                          "border-border-default text-text-primary placeholder:text-text-muted",
                          "focus:border-primary-400 focus:ring-primary-400/20",
                          "w-full resize-none rounded-lg border bg-white px-3.5 py-2.5 text-base sm:text-sm",
                          "transition-all duration-150 focus:ring-2 focus:outline-none",
                          commentRequired && !commentValid && "border-error"
                        )}
                      />
                      {commentRequired && (
                        <p
                          className={cn(
                            "text-right text-xs",
                            commentValid ? "text-text-muted" : "text-error"
                          )}
                        >
                          {t("ratingCommentCounter", {
                            count: commentTrimmed.length,
                            min: MIN_RATING_COMMENT_CHARS,
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {inSnapshotMode && snapshot.comment && (
                    <blockquote className="bg-bg-muted text-text-primary rounded-lg px-3 py-2 text-sm italic">
                      “{snapshot.comment}”
                    </blockquote>
                  )}

                  {inSnapshotMode && canShowEdit && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-primary-600 hover:text-primary-700 self-center text-xs font-medium"
                    >
                      {t("ratingEdit")}
                    </button>
                  )}

                  {editing && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        {t("ratingCancel")}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleUpdate}
                        disabled={!canSubmit}
                      >
                        {t("ratingSave")}
                      </Button>
                    </div>
                  )}

                  {!inSnapshotMode && !editing && (
                    <>
                      {/* Q13.3 — pre-submit incentive so users see the reward
                          BEFORE deciding to skip. Post-skip message lives in
                          `skipIncentiveBody` as a quieter fallback. */}
                      <p className="bg-primary-50 text-primary-800 mx-auto w-full rounded-lg px-3 py-2 text-center text-xs font-medium">
                        {t("ratingIncentive")}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          onClick={() => setSkipped(true)}
                        >
                          {t("ratingSkip")}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={handleCreate}
                          disabled={!canSubmit}
                        >
                          {t("ratingSubmit")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {showSkipIncentive && (
                <div className="border-primary-200 bg-primary-50/60 mt-5 rounded-xl border p-4 text-center">
                  <p className="text-text-primary text-sm font-semibold">
                    {t("skipIncentiveTitle")}
                  </p>
                  <p className="text-text-muted mt-0.5 text-xs">{t("skipIncentiveBody")}</p>
                </div>
              )}

              {isAuthenticated ? (
                <div className={cn("flex flex-col gap-2", showRatingForm && "mt-5")}>
                  <Link href="/book">
                    <Button type="button" variant="primary" size="lg" className="w-full">
                      <SendIcon className="mr-2 h-4 w-4" />
                      {t("sendAnother")}
                    </Button>
                  </Link>
                  <Link href="/customer/shipments">
                    <Button type="button" variant="outline" size="lg" className="w-full">
                      {t("viewShipments")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <SoftRegisterPrompt
                  receiverEmail={receiverEmail ?? null}
                  className={cn(showRatingForm && "mt-5")}
                />
              )}

              <div className="mt-5 flex justify-center">
                <Image
                  src="/images/header/logo-laveina.svg"
                  alt="Laveina"
                  width={96}
                  height={28}
                  unoptimized
                  className="h-7 w-auto"
                />
              </div>
            </div>
          </section>
        </div>
      </SectionContainer>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

type StarRowProps = {
  display: number;
  interactive: boolean;
  disabled: boolean;
  onHover: (value: number) => void;
  onClick: (value: number) => void;
};

// Q13.6 — soft register prompt shown to receivers who arrived via the
// WhatsApp tokenized link without a session. Dismissible — once the user
// taps "Maybe later" we swap the block for a "Track another shipment" CTA
// (spec: don't show "View my shipments" to a logged-out receiver). The
// create-account link carries the receiver email as a query param so the
// register form can pre-fill.
function SoftRegisterPrompt({
  receiverEmail,
  className,
}: {
  receiverEmail: string | null;
  className?: string;
}) {
  const t = useTranslations("deliveryConfirm");
  const [dismissed, setDismissed] = useState(false);

  // SAFETY: next-intl <Link> accepts a string href; we prebuild the query
  // string here so the Link component doesn't need a `query` prop.
  const registerHref = receiverEmail
    ? `/auth/register?email=${encodeURIComponent(receiverEmail)}`
    : "/auth/register";

  if (dismissed) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Link href="/tracking">
          <Button type="button" variant="primary" size="lg" className="w-full">
            {t("trackAnotherShipment")}
          </Button>
        </Link>
        <p className="text-text-muted text-center text-xs">
          {t("registerDismissedNote")}{" "}
          <Link href="/auth/login" className="text-primary-700 font-medium hover:underline">
            {t("registerSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-primary-200 bg-primary-50/50 flex flex-col gap-3 rounded-xl border p-4",
        className
      )}
    >
      <div>
        <p className="text-text-primary text-sm font-semibold">{t("registerTitle")}</p>
        <p className="text-text-muted mt-0.5 text-xs">{t("registerBody")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Link href={registerHref}>
          <Button type="button" variant="primary" size="md" className="w-full">
            {t("registerCreate")}
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full"
          onClick={() => setDismissed(true)}
        >
          {t("registerLater")}
        </Button>
      </div>
    </div>
  );
}

function StarRow({ display, interactive, disabled, onHover, onClick }: StarRowProps) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1">
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const value = i + 1;
        const filled = value <= display;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${value}`}
            onMouseEnter={() => interactive && onHover(value)}
            onMouseLeave={() => interactive && onHover(0)}
            onClick={() => interactive && !disabled && onClick(value)}
            disabled={!interactive || disabled}
            className={cn(
              "p-0.5 transition-colors focus:outline-none",
              interactive && !disabled ? "cursor-pointer" : "cursor-default",
              disabled && "cursor-wait opacity-70"
            )}
          >
            <StarIcon
              filled={filled}
              className={cn("h-6 w-6", filled ? "text-amber-400" : "text-border-default")}
            />
          </button>
        );
      })}
    </div>
  );
}
