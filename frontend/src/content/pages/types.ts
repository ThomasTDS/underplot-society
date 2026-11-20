/**
 * The site's own pages (About, Privacy, Accessibility), written in code rather than
 * in the panel: they change rarely, and a change goes through review like any other.
 *
 * Text is plain strings, rendered as text, never as HTML. A piece of text can be a
 * link, or be marked as another language (for screen readers).
 */
export type Inline = string | { text: string; href?: string; lang?: string };

/** A paragraph (one string, or pieces), or a bulleted list of such paragraphs. */
export type Block = string | Inline[] | { list: (string | Inline[])[] };

export type Section = { heading: string; blocks: Block[] };

export type InstitutionalPage = {
  title: string;
  /** For search results and link previews. */
  description: string;
  /** Text still to be reviewed or written by the author: the page says so. */
  draft: boolean;
  /** ISO date of the last change to the text. */
  updated: string;
  /** Opening paragraphs, before the first heading. */
  intro: Block[];
  sections: Section[];
};

export const institutionalPageKeys = ["about", "privacy", "accessibility"] as const;
export type InstitutionalPageKey = (typeof institutionalPageKeys)[number];

export type InstitutionalPages = Record<InstitutionalPageKey, InstitutionalPage>;
