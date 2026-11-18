"use client";

import { useEffect } from "react";
import { setAlternates, type Alternates } from "@/i18n/alternates";

/** Tells the language switcher this page's address in each language. Renders nothing. */
export function LanguageAlternates({ paths }: { paths: Alternates }) {
  const key = JSON.stringify(paths);
  useEffect(() => {
    setAlternates(JSON.parse(key) as Alternates);
    return () => setAlternates(null);
  }, [key]);
  return null;
}
