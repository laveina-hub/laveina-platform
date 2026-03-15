import { useTranslations } from "next-intl";

import { CardHeader, CardShell } from "@/components/atoms";
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
    <CardShell>
      <CardHeader title={t("contactSupport")} />

      <div className="flex flex-col gap-4 px-6 py-9 md:px-9 lg:flex-row xl:grid xl:grid-cols-3">
        {contacts.map((contact) => (
          <div
            key={contact.key}
            className="border-border-default hover:border-primary-200 hover:bg-primary-50 flex w-full items-center gap-3 rounded-xl border px-5 py-4 transition-colors last:w-auto"
          >
            <IconBadge variant="light" className="h-auto w-auto p-4">
              {contact.icon}
            </IconBadge>
            <span
              className={
                contact.isLink
                  ? "font-body text-primary-500 text-xl font-medium whitespace-nowrap"
                  : "font-body text-text-primary text-xl font-medium whitespace-nowrap"
              }
            >
              {contact.label}
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
