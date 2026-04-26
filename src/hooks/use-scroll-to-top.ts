"use client";

import { useEffect, useRef } from "react";

type Options = {
  behavior?: ScrollBehavior;
};

// Resets window scroll to top whenever `key` changes. Use for in-place state
// swaps (wizard step, tab change, table pagination) where the URL doesn't
// change so Next.js's automatic scroll-to-top doesn't fire. The first render
// is skipped so landing on a page never scrolls (Next.js already handles that
// for real navigations).
export function useScrollToTop(key: unknown, options: Options = {}) {
  const { behavior = "auto" } = options;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior });
  }, [key, behavior]);
}
