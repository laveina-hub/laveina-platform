import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className={cn("border-border-default bg-bg-primary overflow-hidden border-t")}>
      <div className="max-w-container mx-auto space-y-10 px-6 py-10 lg:px-10">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <p className="text-text-muted text-sm md:text-lg">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <nav
            aria-label={t("legalNav")}
            className="text-text-muted flex items-center gap-3 text-sm md:text-lg"
          >
            <Link href="/terms" className="hover:text-text-primary transition-colors">
              {t("terms")}
            </Link>
            <span aria-hidden="true" className="text-border-default select-none">
              |
            </span>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">
              {t("privacy")}
            </Link>
          </nav>
        </div>
      </div>
      <div className="overflow-hidden">
        <Image
          src="/images/footer/logo-laveina-footer.svg"
          alt=""
          aria-hidden="true"
          width={1800}
          height={240}
          unoptimized
          className="h-auto w-full"
        />
      </div>
    </footer>
  );
}
