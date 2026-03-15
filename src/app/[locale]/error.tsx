"use client";

import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-error-500 text-5xl font-bold">{t("somethingWentWrong")}</h1>
      <p className="text-text-secondary mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="bg-primary-500 hover:bg-primary-600 mt-6 rounded-lg px-6 py-2 text-white transition-colors"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
