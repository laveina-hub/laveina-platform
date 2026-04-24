"use client";

import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, CardBody, CardShell } from "@/components/atoms";
import { LockIcon } from "@/components/icons";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TEMPLATES,
  isMandatoryTemplate,
  type NotificationChannel,
  type NotificationPrefs,
  type NotificationTemplate,
} from "@/constants/notification-prefs";
import { Link } from "@/i18n/navigation";
import { formatDateTime, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShipmentStatus } from "@/types/enums";

export type FeedEvent = {
  id: string;
  scanned_at: string;
  new_status: ShipmentStatus;
  tracking_id: string;
  shipment_id: string;
};

type Props = {
  initialPrefs: NotificationPrefs;
  feed: FeedEvent[];
};

export function CustomerNotificationsSection({ initialPrefs, feed }: Props) {
  const t = useTranslations("customerNotifications");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;

  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(initialPrefs),
    [prefs, initialPrefs]
  );

  function handleToggle(template: NotificationTemplate, channel: NotificationChannel) {
    if (isMandatoryTemplate(template)) return;
    setPrefs((prev) => ({
      ...prev,
      [template]: {
        ...prev[template],
        [channel]: !prev[template][channel],
      },
    }));
  }

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/customer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      if (!res.ok) throw new Error("prefs save failed");
      const json = await res.json();
      setPrefs(json.data.prefs as NotificationPrefs);
      toast.success(t("prefsSaved"));
    } catch (err) {
      console.error("notification prefs save failed:", err);
      toast.error(t("prefsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <CardShell>
        <CardBody>
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-text-primary text-base font-semibold">{t("feedTitle")}</h2>
              <p className="text-text-muted mt-0.5 text-xs">{t("feedSubtitle")}</p>
            </div>
          </header>

          {feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Bell className="text-text-muted" size={24} aria-hidden />
              <p className="text-text-muted text-sm">{t("feedEmpty")}</p>
            </div>
          ) : (
            <ul className="divide-border-muted divide-y">
              {feed.map((event) => (
                <li key={event.id} className="py-3">
                  <Link
                    href={`/customer/shipments/${event.shipment_id}`}
                    className="group hover:bg-bg-muted/40 focus-visible:outline-primary-500 -mx-2 flex items-start gap-3 rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span
                      aria-hidden
                      className="bg-primary-50 text-primary-600 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    >
                      <Bell size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary text-sm">
                        {t("feedRow", {
                          trackingId: event.tracking_id,
                          status: tStatus(event.new_status),
                        })}
                      </p>
                      <p className="text-text-muted mt-0.5 text-xs">
                        {formatDateTime(event.scanned_at, locale)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </CardShell>

      <CardShell>
        <CardBody>
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-text-primary text-base font-semibold">{t("prefsTitle")}</h2>
              <p className="text-text-muted mt-0.5 text-xs">{t("prefsSubtitle")}</p>
            </div>
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-text-muted text-xs">
                  <th scope="col" className="w-2/5 text-left font-medium">
                    {t("columnEvent")}
                  </th>
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <th
                      key={channel}
                      scope="col"
                      className="px-2 text-center font-medium capitalize"
                    >
                      {t(`channel.${channel}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border-muted divide-y">
                {NOTIFICATION_TEMPLATES.map((template) => {
                  const mandatory = isMandatoryTemplate(template);
                  return (
                    <tr key={template}>
                      <td className="py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary text-sm">
                            {t(`template.${template}`)}
                          </span>
                          {mandatory && (
                            <span
                              className="text-text-muted bg-bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                              title={t("mandatoryTooltip")}
                            >
                              <LockIcon size={10} />
                              {t("mandatory")}
                            </span>
                          )}
                        </div>
                      </td>
                      {NOTIFICATION_CHANNELS.map((channel) => {
                        const checked = prefs[template][channel];
                        return (
                          <td key={channel} className="py-3 text-center">
                            <label
                              className={cn(
                                "inline-flex items-center justify-center",
                                mandatory && "cursor-not-allowed"
                              )}
                            >
                              <span className="sr-only">
                                {t("toggleLabel", {
                                  template: t(`template.${template}`),
                                  channel: t(`channel.${channel}`),
                                })}
                              </span>
                              <input
                                type="checkbox"
                                checked={mandatory ? true : checked}
                                disabled={mandatory || saving}
                                onChange={() => handleToggle(template, channel)}
                                className="accent-primary-600 h-4 w-4"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </CardShell>
    </div>
  );
}
