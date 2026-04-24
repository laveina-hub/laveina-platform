"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { HelpCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/components/molecules/DataTable";
import { type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TICKET_STATUSES, type TicketStatus } from "@/validations/support-ticket.schema";

import {
  fetchTickets,
  formatTicketDateTime,
  unwrapCustomer,
  type AdminTicket,
} from "./admin-support-tickets.data";
import { AdminSupportTicketDialog } from "./AdminSupportTicketDialog";

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-amber-50 text-amber-700 ring-amber-600/20",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function AdminSupportTicketsSection() {
  const t = useTranslations("adminSupport");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [activeTicket, setActiveTicket] = useState<AdminTicket | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "support-tickets", statusFilter],
    queryFn: () => fetchTickets(statusFilter),
    placeholderData: (previous) => previous,
  });

  const columns: ColumnDef<AdminTicket, unknown>[] = [
    {
      accessorKey: "subject",
      header: t("columnSubject"),
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">{row.original.subject}</span>
      ),
    },
    {
      id: "customer",
      header: t("columnCustomer"),
      cell: ({ row }) => {
        const customer = unwrapCustomer(row.original.customer);
        return (
          <div className="flex flex-col">
            <span className="text-text-primary">{customer?.full_name ?? "—"}</span>
            <span className="text-text-muted text-xs">{customer?.email ?? ""}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("columnStatus"),
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            STATUS_STYLES[row.original.status]
          )}
        >
          {t(`status.${row.original.status}`)}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("columnDate"),
      cell: ({ row }) => (
        <span className="text-text-muted text-xs">
          {formatTicketDateTime(row.original.created_at, locale)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) =>
            // SAFETY: <select> options only emit values from TICKET_STATUSES or the literal "all".
            setStatusFilter(e.target.value as TicketStatus | "all")
          }
          className="border-border-default focus-visible:ring-primary-500 focus-visible:border-primary-500 rounded-lg border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="all">{t("allStatuses")}</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <div className="border-error-200 bg-error-50 text-error-700 rounded-xl border p-4 text-sm">
          {t("fetchError")}
        </div>
      ) : null}

      {!isLoading && data && data.length === 0 ? (
        <div className="border-border-default flex flex-col items-center gap-2 rounded-xl border bg-white p-12 text-center">
          <HelpCircle size={28} className="text-text-muted" />
          <p className="text-text-primary font-medium">{t("noTickets")}</p>
          <p className="text-text-muted text-sm">{t("noTicketsDesc")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          onRowClick={(row) => setActiveTicket(row)}
        />
      )}

      <AdminSupportTicketDialog
        ticket={activeTicket}
        onOpenChange={(open) => {
          if (!open) setActiveTicket(null);
        }}
        onSaved={(saved) => {
          setActiveTicket(saved);
          queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
        }}
      />
    </div>
  );
}
