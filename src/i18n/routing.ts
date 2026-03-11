import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "ca"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});
