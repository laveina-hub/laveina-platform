"use client";

import { HelpCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, CardBody, CardShell, Input, Label } from "@/components/atoms";
import { ChevronIcon, ClockIcon, MessageIcon, WhatsAppIcon } from "@/components/icons";
import { formatDateLong, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";

// FAQ kept inline — MDX infrastructure isn't worth it for 4 answers. When the
// list grows or marketing wants CMS control, swap to MDX without changing the
// surrounding layout.
const FAQ_KEYS = ["tracking", "cancellation", "lostParcel", "changeAddress"] as const;

// Q14.1.12 — support hours render as 3 rows from this lookup. Translation
// values carry the time strings so a localized format ("9:00 – 18:00" vs.
// "9 AM – 6 PM") can be tweaked without touching this file.
const SUPPORT_HOUR_KEYS = ["weekdays", "saturday", "sunday"] as const;

// SAFETY: Crisp injects this global lazily; we only call it after asserting
// `typeof window !== "undefined"` and that `$crisp` was actually bound.
type CrispCommand = readonly [string, string];
type CrispGlobal = { push: (cmd: CrispCommand) => void };

function openCrispChat() {
  if (typeof window === "undefined") return;
  const crisp = (window as unknown as { $crisp?: CrispGlobal }).$crisp;
  if (!crisp || typeof crisp.push !== "function") return;
  crisp.push(["do", "chat:open"]);
}

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialTickets: Ticket[];
  whatsappHref: string | null;
};

export function CustomerSupportSection({ initialTickets, whatsappHref }: Props) {
  const t = useTranslations("customerSupport");
  const locale = useLocale() as Locale;

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [openFaqKey, setOpenFaqKey] = useState<(typeof FAQ_KEYS)[number] | null>(null);

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("ticket submit failed");
      const json = await res.json();
      setTickets((prev) => [json.data as Ticket, ...prev]);
      setSubject("");
      setMessage("");
      toast.success(t("ticketCreated"));
    } catch (err) {
      console.error("support ticket submit failed:", err);
      toast.error(t("ticketCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {/* Quick-contact channels */}
      <div className="grid gap-3 sm:grid-cols-2">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:outline-primary-500 block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <CardShell className="hover:border-primary-300 transition-colors">
              <CardBody className="flex items-center gap-3 px-5! py-4!">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E7FBEE] text-[#128C7E]">
                  <WhatsAppIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-semibold">{t("whatsappTitle")}</p>
                  <p className="text-text-muted text-xs">{t("whatsappSubtitle")}</p>
                </div>
              </CardBody>
            </CardShell>
          </a>
        )}
        {/* Q14.1.12 — open the Crisp widget directly. The script is injected
            globally in the locale layout, so we don't need to load anything
            here. The card stays inert (no extra render, no toast) when Crisp
            hasn't booted yet — `openCrispChat()` no-ops in that case. */}
        <button
          type="button"
          onClick={openCrispChat}
          className="focus-visible:outline-primary-500 block rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <CardShell className="hover:border-primary-300 cursor-pointer transition-colors">
            <CardBody className="flex items-center gap-3 px-5! py-4!">
              <span className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <MessageIcon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-semibold">{t("liveChatTitle")}</p>
                <p className="text-text-muted text-xs">{t("liveChatSubtitle")}</p>
              </div>
            </CardBody>
          </CardShell>
        </button>
      </div>

      {/* Q14.1.12 — support hours block. Helps users set expectations before
          they tap the WhatsApp / live-chat tile and wonder why nobody answers
          on a Sunday. Single source of truth for the times lives in i18n. */}
      <CardShell>
        <CardBody className="flex flex-col gap-3 px-5! py-4! sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ClockIcon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-text-primary text-sm font-semibold">{t("supportHoursTitle")}</p>
              <p className="text-text-muted text-xs">{t("supportHoursTimezone")}</p>
            </div>
          </div>
          <dl className="text-text-primary grid grid-cols-1 gap-1 text-xs sm:text-right">
            {SUPPORT_HOUR_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2 sm:justify-end">
                <dt className="text-text-muted font-medium">{t(`supportHoursDay.${key}`)}</dt>
                <dd className="tabular-nums">{t(`supportHoursValue.${key}`)}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </CardShell>

      {/* FAQ */}
      <CardShell>
        <CardBody>
          <header className="mb-4 flex items-center gap-2">
            <HelpCircle className="text-primary-600" size={20} aria-hidden />
            <h2 className="text-text-primary text-base font-semibold">{t("faqTitle")}</h2>
          </header>
          <ul className="divide-border-muted divide-y">
            {FAQ_KEYS.map((key) => {
              const open = openFaqKey === key;
              return (
                <li key={key} className="py-2">
                  <button
                    type="button"
                    onClick={() => setOpenFaqKey(open ? null : key)}
                    aria-expanded={open}
                    className="focus-visible:outline-primary-500 flex w-full items-center justify-between gap-3 rounded py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span className="text-text-primary text-sm font-medium">
                      {t(`faq.${key}.q`)}
                    </span>
                    <ChevronIcon
                      direction={open ? "up" : "down"}
                      size={16}
                      className="text-text-muted shrink-0"
                    />
                  </button>
                  {open && (
                    <p className="text-text-muted mt-1 pb-2 text-sm whitespace-pre-line">
                      {t(`faq.${key}.a`)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </CardShell>

      {/* Contact form */}
      <CardShell>
        <CardBody>
          <header className="mb-4">
            <h2 className="text-text-primary text-base font-semibold">{t("formTitle")}</h2>
            <p className="text-text-muted mt-0.5 text-xs">{t("formSubtitle")}</p>
          </header>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="support_subject">{t("formSubject")}</Label>
              <Input
                id="support_subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={140}
                required
                className="mt-1.5"
                placeholder={t("formSubjectPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="support_message">{t("formMessage")}</Label>
              <textarea
                id="support_message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
                required
                placeholder={t("formMessagePlaceholder")}
                className={cn(
                  "border-border-default text-text-primary placeholder:text-text-muted",
                  "focus:border-primary-400 focus:ring-primary-400/20",
                  "mt-1.5 w-full resize-none rounded-lg border bg-white px-3.5 py-2.5 text-sm",
                  "focus:ring-2 focus:outline-none"
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={!canSubmit}>
                {submitting ? t("formSubmitting") : t("formSubmit")}
              </Button>
            </div>
          </form>
        </CardBody>
      </CardShell>

      {/* Ticket history */}
      <CardShell>
        <CardBody>
          <header className="mb-4">
            <h2 className="text-text-primary text-base font-semibold">{t("historyTitle")}</h2>
            <p className="text-text-muted mt-0.5 text-xs">{t("historySubtitle")}</p>
          </header>
          {tickets.length === 0 ? (
            <p className="text-text-muted py-4 text-center text-sm">{t("historyEmpty")}</p>
          ) : (
            <ul className="divide-border-muted divide-y">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary text-sm font-semibold">{ticket.subject}</p>
                      <p className="text-text-muted text-xs">
                        {t("submittedOn", { date: formatDateLong(ticket.created_at, locale) })}
                      </p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="text-text-primary mt-2 text-sm whitespace-pre-line">
                    {ticket.message}
                  </p>
                  {ticket.admin_response && (
                    <div className="bg-primary-50/60 mt-3 rounded-lg p-3">
                      <p className="text-primary-700 text-xs font-semibold">{t("adminResponse")}</p>
                      <p className="text-text-primary mt-1 text-sm whitespace-pre-line">
                        {ticket.admin_response}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </CardShell>
    </div>
  );
}

function TicketStatusBadge({ status }: { status: string }) {
  const t = useTranslations("customerSupport");
  const tone =
    status === "resolved" || status === "closed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "in_progress"
        ? "bg-amber-50 text-amber-700"
        : "bg-primary-50 text-primary-700";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        tone
      )}
    >
      {t(`status.${status}` as "status.open")}
    </span>
  );
}
