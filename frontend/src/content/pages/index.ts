import type { Locale } from "@/i18n/config";
import { pages as en } from "./en";
import { pages as es } from "./es";
import { pages as ptBr } from "./pt-br";
import type { InstitutionalPage, InstitutionalPageKey, InstitutionalPages } from "./types";

export const institutionalPages: Record<Locale, InstitutionalPages> = { en, "pt-br": ptBr, es };

/** The address of each institutional page: the same in every language, like /articles. */
export const institutionalPath: Record<InstitutionalPageKey, string> = {
  about: "/about",
  privacy: "/privacy",
  accessibility: "/accessibility",
};

export function getInstitutionalPage(locale: Locale, key: InstitutionalPageKey): InstitutionalPage {
  return institutionalPages[locale][key];
}

export { institutionalPageKeys, type InstitutionalPageKey } from "./types";
