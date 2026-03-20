"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/atoms";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomerShipmentsError({ error, reset }: Props) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Customer shipments error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{t("somethingWentWrong")}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{t("tryAgain")}</p>
      {error.digest && <p className="mt-1 text-xs text-gray-400">Error ID: {error.digest}</p>}
      <Button onClick={reset} variant="outline" size="sm" className="mt-4">
        {t("tryAgain")}
      </Button>
    </div>
  );
}
