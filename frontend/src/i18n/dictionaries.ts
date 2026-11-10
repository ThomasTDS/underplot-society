import type { Locale } from "./config";
import en from "./messages/en.json";
import es from "./messages/es.json";
import ptBr from "./messages/pt-br.json";

/** English is the source of truth for the message keys. */
export type Messages = typeof en;

export const dictionaries: Record<Locale, Messages> = {
  en,
  "pt-br": ptBr,
  es,
};

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
