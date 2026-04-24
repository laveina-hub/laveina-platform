"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Label } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { type Locale } from "@/lib/format";
import { RATING_STATUSES, type RatingStatus } from "@/validations/rating.schema";

import {
  formatRatingDateTime,
  saveRating,
  unwrapOne,
  type AdminRating,
} from "./admin-ratings.data";
import { StarsGlyph } from "./StarsGlyph";

type AdminRatingDialogProps = {
  rating: AdminRating | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (rating: AdminRating) => void;
};

export function AdminRatingDialog({ rating, onOpenChange, onSaved }: AdminRatingDialogProps) {
  const t = useTranslations("adminRatings");
  const locale = useLocale() as Locale;

  const [status, setStatus] = useState<RatingStatus>("approved");

  useEffect(() => {
    setStatus(rating?.status ?? "approved");
  }, [rating?.id, rating?.status]);

  const mutation = useMutation({
    mutationFn: (nextStatus: RatingStatus) => {
      if (!rating) throw new Error("no rating");
      return saveRating(rating.id, nextStatus);
    },
    onSuccess: (saved) => {
      toast.success(t("saved"));
      onSaved(saved);
    },
    onError: () => {
      toast.error(t("saveFailed"));
    },
  });

  const customer = unwrapOne(rating?.customer ?? null);
  const shipment = unwrapOne(rating?.shipment ?? null);
  const pickup = unwrapOne(rating?.pickup_point ?? null);
  const hasChanges = rating !== null && status !== rating.status;

  return (
    <Dialog.Root open={rating !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white">
          <div className="border-border-muted flex items-start justify-between gap-4 border-b p-5">
            <div>
              <Dialog.Title className="text-text-primary text-base font-semibold">
                {t("viewRating")}
              </Dialog.Title>
              <Dialog.Description className="text-text-muted mt-1 text-sm">
                {shipment?.tracking_id ?? ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="focus-visible:ring-primary-500 text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-1 focus-visible:ring-2 focus-visible:outline-none"
                aria-label={t("close")}
              >
                <CloseIcon size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {rating ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoRow label={t("columnCustomer")} value={customer?.full_name ?? "—"} />
                  <InfoRow label="Email" value={customer?.email ?? "—"} />
                  {pickup ? (
                    <InfoRow label={t("columnSubject")} value={pickup.name ?? "—"} />
                  ) : null}
                  <InfoRow
                    label={t("columnDate")}
                    value={formatRatingDateTime(rating.created_at, locale)}
                  />
                </div>

                <div>
                  <Label className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                    {t("columnStars")}
                  </Label>
                  <div className="mt-2">
                    <StarsGlyph stars={rating.stars} />
                  </div>
                </div>

                <div>
                  <Label className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                    {t("commentLabel")}
                  </Label>
                  <div className="border-border-muted bg-bg-muted mt-2 rounded-lg border p-4 text-sm whitespace-pre-wrap">
                    {rating.comment?.trim() || (
                      <span className="text-text-muted italic">{t("noComment")}</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="rating-status">{t("statusLabel")}</Label>
                  <select
                    id="rating-status"
                    value={status}
                    onChange={(e) =>
                      // SAFETY: <select> options only emit values drawn from RATING_STATUSES.
                      setStatus(e.target.value as RatingStatus)
                    }
                    className="border-border-default focus-visible:ring-primary-500 focus-visible:border-primary-500 mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {RATING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
          </div>

          <div className="border-border-muted flex items-center justify-end gap-3 border-t p-5">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                {t("close")}
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              onClick={() => mutation.mutate(status)}
              disabled={!hasChanges || mutation.isPending}
            >
              {status === "approved"
                ? t("approveAction")
                : status === "rejected"
                  ? t("rejectAction")
                  : t("pendingAction")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
      <dd className="text-text-primary mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
