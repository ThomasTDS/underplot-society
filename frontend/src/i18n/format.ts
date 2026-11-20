import { htmlLang, type Locale } from "./config";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A publication date as the reader's language writes it, e.g. "18 de novembro de 2026". */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // A bare date ("2026-11-20") is already a calendar day; JavaScript reads it as
  // midnight UTC, so it is written in UTC to stay on that day. A moment in time follows
  // Brazil's calendar day, where the site is run from.
  const timeZone = DATE_ONLY.test(iso) ? "UTC" : "America/Sao_Paulo";
  return new Intl.DateTimeFormat(htmlLang[locale], { dateStyle: "long", timeZone }).format(date);
}

/** Fills "{name}" placeholders in a message. */
export function fill(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
