"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Label } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { type Locale } from "@/lib/format";
import { TICKET_STATUSES, type TicketStatus } from "@/validations/support-ticket.schema";

import {
  formatTicketDateTime,
  saveTicket,
  unwrapCustomer,
  type AdminTicket,
} from "./admin-support-tickets.data";

type AdminSupportTicketDialogProps = {
  ticket: AdminTicket | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (ticket: AdminTicket) => void;
};

export function AdminSupportTicketDialog({
  ticket,
  onOpenChange,
  onSaved,
}: AdminSupportTicketDialogProps) {
  const t = useTranslations("adminSupport");
  const locale = useLocale() as Locale;

  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<TicketStatus>("open");

  // Reset the form whenever the caller swaps tickets.
  useEffect(() => {
    setResponse(ticket?.admin_response ?? "");
    // SAFETY: TicketStatus is exhaustive over the DB status values, and the
    // ticket row comes from our own admin route.
    setStatus((ticket?.status as TicketStatus | undefined) ?? "open");
  }, [ticket?.id, ticket?.admin_response, ticket?.status]);

  const mutation = useMutation({
    mutationFn: (input: { status?: TicketStatus; admin_response?: string }) => {
      if (!ticket) throw new Error("no ticket");
      return saveTicket(ticket.id, input);
    },
    onSuccess: (saved) => {
      toast.success(t("saved"));
      onSaved(saved);
    },
    onError: () => {
      toast.error(t("saveFailed"));
    },
  });

  const customer = unwrapCustomer(ticket?.customer ?? null);
  const responseChanged = (ticket?.admin_response ?? "") !== response.trim();
  const statusChanged = ticket?.status !== status;
  const canSave = ticket !== null && !mutation.isPending && (responseChanged || statusChanged);

  function handleSave() {
    if (!ticket) return;
    const input: { status?: TicketStatus; admin_response?: string } = {};
    if (statusChanged) input.status = status;
    if (responseChanged) input.admin_response = response.trim();
    mutation.mutate(input);
  }

  return (
    <Dialog.Root open={ticket !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(640px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white">
          <div className="border-border-muted flex items-start justify-between gap-4 border-b p-5">
            <div>
              <Dialog.Title className="text-text-primary text-base font-semibold">
                {t("viewTicket")}
              </Dialog.Title>
              <Dialog.Description className="text-text-muted mt-1 text-sm">
                {ticket?.subject ?? ""}
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
            {ticket ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoRow label={t("customerEmail")} value={customer?.email ?? "—"} />
                  <InfoRow label={t("customerPhone")} value={customer?.phone ?? "—"} />
                  {ticket.shipment_id ? (
                    <InfoRow label={t("shipmentRef")} value={ticket.shipment_id} />
                  ) : null}
                  <InfoRow
                    label={t("columnDate")}
                    value={formatTicketDateTime(ticket.created_at, locale)}
                  />
                </div>

                <div>
                  <Label className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                    {t("messageLabel")}
                  </Label>
                  <div className="border-border-muted bg-bg-muted mt-2 rounded-lg border p-4 text-sm whitespace-pre-wrap">
                    {ticket.message}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ticket-status">{t("statusLabel")}</Label>
                  <select
                    id="ticket-status"
                    value={status}
                    onChange={(e) =>
                      // SAFETY: <select> options only emit values drawn from TICKET_STATUSES.
                      setStatus(e.target.value as TicketStatus)
                    }
                    className="border-border-default focus-visible:ring-primary-500 focus-visible:border-primary-500 mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="ticket-response">{t("responseLabel")}</Label>
                  <textarea
                    id="ticket-response"
                    rows={5}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={t("responsePlaceholder")}
                    className="border-border-default focus-visible:ring-primary-500 focus-visible:border-primary-500 mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
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
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {mutation.isPending ? t("saving") : t("saveReply")}
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
