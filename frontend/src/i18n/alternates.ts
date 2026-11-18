import type { Locale } from "./config";

/**
 * Where the language switcher should send the reader when the current page has
 * its own address in each language (an article's slug differs per language).
 * Set by the page with <LanguageAlternates>; null means "swap the locale prefix".
 */
export type Alternates = Partial<Record<Locale, string>>;

let current: Alternates | null = null;
const listeners = new Set<() => void>();

export function getAlternates(): Alternates | null {
  return current;
}

export function setAlternates(next: Alternates | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAlternates(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
