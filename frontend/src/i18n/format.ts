import { htmlLang, type Locale } from "./config";

/** A publication date as the reader's language writes it, e.g. "18 de novembro de 2026". */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // The site is run from Brazil: dates follow its calendar day.
  return new Intl.DateTimeFormat(htmlLang[locale], { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(date);
}

/** Fills "{name}" placeholders in a message. */
export function fill(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
