import { useTranslations } from "next-intl";

import { Heading } from "@/components/atoms";
import { PhoneIcon, MailIcon, MessageIcon } from "@/components/icons";
import { IconBadge } from "@/components/molecules";

export function ContactSupportSection() {
  const t = useTranslations("tracking");

  const contacts = [
    {
      icon: <PhoneIcon size={24} className="text-primary-500" />,
      label: t("phone"),
      key: "phone",
    },
    {
      icon: <MailIcon size={24} className="text-primary-500" />,
      label: t("email"),
      key: "email",
      isLink: true,
    },
    {
      icon: <MessageIcon size={24} className="text-primary-500" />,
      label: t("liveChat"),
      key: "liveChat",
      isLink: true,
    },
  ];

  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="border-border-muted border-b px-6 py-5 md:px-8">
        <Heading variant="card">{t("recentShipments")}</Heading>
      </div>

      <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row md:px-8">
        {contacts.map((contact) => (
          <div
            key={contact.key}
            className="border-border-default hover:border-primary-200 hover:bg-primary-50 flex flex-1 items-center gap-3 rounded-xl border px-5 py-4 transition-colors"
          >
            <IconBadge size="md" variant="light">
              {contact.icon}
            </IconBadge>
            <span
              className={
                contact.isLink
                  ? "font-body text-primary-500 text-sm font-medium"
                  : "font-body text-text-primary text-sm font-medium"
              }
            >
              {contact.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
