"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/atoms";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ScanError({ error, reset }: Props) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("QR scan error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h2 className="text-text-primary text-lg font-semibold">{t("somethingWentWrong")}</h2>
      <p className="text-text-muted mt-2 max-w-sm text-sm">{t("tryAgain")}</p>
      {error.digest && <p className="text-text-muted mt-1 text-xs">Error ID: {error.digest}</p>}
      <Button onClick={reset} variant="outline" size="sm" className="mt-4">
        {t("tryAgain")}
      </Button>
    </div>
  );
}
