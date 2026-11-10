// The site's own message files, so tests follow the real texts in every language.
import en from "../../frontend/src/i18n/messages/en.json";
import es from "../../frontend/src/i18n/messages/es.json";
import ptBr from "../../frontend/src/i18n/messages/pt-br.json";

export const locales = ["en", "pt-br", "es"] as const;
export type Locale = (typeof locales)[number];

export const messages: Record<Locale, typeof en> = { en, "pt-br": ptBr, es };

export const htmlLang: Record<Locale, string> = { en: "en", "pt-br": "pt-BR", es: "es" };
