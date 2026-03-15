import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-text-primary text-5xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-text-secondary mt-2">{t("pageNotFound")}</p>
      <Link
        href="/"
        className="bg-primary-500 hover:bg-primary-600 mt-6 rounded-lg px-6 py-2 text-white transition-colors"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
