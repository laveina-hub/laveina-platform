"use client";

import Script from "next/script";

const CRISP_WEBSITE_ID = "783ad13f-2e0b-4d25-9d48-1b4a6df20341";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  return (
    <Script
      id="crisp-chat"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          window.$crisp = [];
          window.CRISP_WEBSITE_ID = "${CRISP_WEBSITE_ID}";
          (function() {
            var s = document.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = true;
            document.head.appendChild(s);
          })();
        `,
      }}
    />
  );
}
