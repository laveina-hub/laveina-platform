import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function DashboardNotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="bg-primary-50 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <FileQuestion size={32} className="text-primary-500" />
      </div>
      <h2 className="text-text-primary text-xl font-semibold">{t("notFoundTitle")}</h2>
      <p className="text-text-muted mt-2 max-w-md text-sm">{t("pageNotFound")}</p>
      <Link
        href="/"
        className="border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100 active:text-primary-700 mt-6 inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-medium transition-all duration-150"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
