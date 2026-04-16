"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/atoms";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: Props) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={32} className="text-red-500" />
      </div>
      <h2 className="text-text-primary text-xl font-semibold">{t("somethingWentWrong")}</h2>
      <p className="text-text-muted mt-2 max-w-md text-sm">
        {error.message || t("somethingWentWrong")}
      </p>
      {error.digest && <p className="text-text-muted mt-1 text-xs">Error ID: {error.digest}</p>}
      <Button onClick={reset} variant="outline" size="sm" className="mt-6">
        {t("tryAgain")}
      </Button>
    </div>
  );
}
