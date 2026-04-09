"use client";

import { useEffect } from "react";

const IUBENDA_WIDGET_SRC =
  "https://embeds.iubenda.com/widgets/c1efb18a-c2d5-443d-8f04-b88326ade74b.js";

function positionPrivacyWidget(widget: HTMLElement) {
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    widget.style.setProperty("left", "0", "important");
    widget.style.removeProperty("transform");
  } else {
    widget.style.setProperty("left", "50%", "important");
    widget.style.setProperty("transform", "translateX(-50%)", "important");
  }
}

/** Load the Iubenda embed script exactly once across locale changes. */
function ensureIubendaScript() {
  if (document.querySelector(`script[src="${IUBENDA_WIDGET_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = IUBENDA_WIDGET_SRC;
  script.async = true;
  document.body.appendChild(script);
}

export function IubendaCookie() {
  useEffect(() => {
    ensureIubendaScript();

    let widgetRef: HTMLElement | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    function applyPositioning() {
      const btn = document.querySelector<HTMLElement>(".iubenda-tp-btn");
      if (btn) {
        btn.style.setProperty("right", "auto", "important");
        btn.style.setProperty("left", "60px", "important");
      }

      const widget = document.querySelector<HTMLElement>(".iubenda-tp-container");
      if (!widget) return false;

      widgetRef = widget;
      positionPrivacyWidget(widget);
      return true;
    }

    if (!applyPositioning()) {
      const observer = new MutationObserver(() => {
        if (applyPositioning()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const timeout = setTimeout(() => observer.disconnect(), 15_000);

      const handleResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (widgetRef) positionPrivacyWidget(widgetRef);
        }, 150);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        observer.disconnect();
        clearTimeout(timeout);
        if (resizeTimer) clearTimeout(resizeTimer);
        window.removeEventListener("resize", handleResize);
      };
    }

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (widgetRef) positionPrivacyWidget(widgetRef);
      }, 150);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
