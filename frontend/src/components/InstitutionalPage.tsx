import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getInstitutionalPage, institutionalPath, type InstitutionalPageKey } from "@/content/pages";
import type { Block, Inline } from "@/content/pages/types";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { formatDate } from "@/i18n/format";
import { baseMetadata, pageAlternates, samePathInEveryLanguage } from "@/seo/metadata";
import { getSiteConfig } from "@/seo/site";
import styles from "./InstitutionalPage.module.css";

export async function institutionalMetadata(lang: string, key: InstitutionalPageKey): Promise<Metadata> {
  if (!isLocale(lang)) return {};
  const site = await getSiteConfig();
  const page = getInstitutionalPage(lang, key);
  const base = baseMetadata(site, lang, page.description);
  const rest = institutionalPath[key];
  const canonical = `/${lang}${rest}`;

  return {
    ...base,
    title: page.title,
    alternates: pageAlternates(site, canonical, samePathInEveryLanguage(rest), rest),
    openGraph: { ...base.openGraph, url: canonical, title: page.title, description: page.description },
  };
}

export function InstitutionalPage({ lang, page: key }: { lang: Locale; page: InstitutionalPageKey }) {
  const page = getInstitutionalPage(lang, key);
  const labels = getMessages(lang).pages;
  const [updatedBefore, updatedAfter = ""] = labels.updated.split("{date}");

  return (
    <article className={styles.page} data-page={key}>
      <header className={styles.header}>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.meta}>
          {updatedBefore}
          <time dateTime={page.updated}>{formatDate(page.updated, lang)}</time>
          {updatedAfter}
        </p>
        {page.draft && (
          <p className={styles.draft} role="note">
            {labels.draft}
          </p>
        )}
      </header>
      <Blocks blocks={page.intro} />
      {page.sections.map((section) => (
        <section key={section.heading} className={styles.section}>
          <h2 className={styles.heading}>{section.heading}</h2>
          <Blocks blocks={section.blocks} />
        </section>
      ))}
      {/* The layout's metadata is read per request (site URL, indexing); a page with
          no other request-time part needs this marker to say so. */}
      <Suspense>
        <RequestTime />
      </Suspense>
    </article>
  );
}

async function RequestTime() {
  await connection();
  return null;
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, i) =>
    typeof block === "object" && "list" in block ? (
      <ul key={i} className={styles.list}>
        {block.list.map((item, j) => (
          <li key={j}>
            <Text value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <p key={i} className={styles.paragraph}>
        <Text value={block} />
      </p>
    ),
  );
}

/** Always rendered as text: nothing here is inserted as HTML. */
function Text({ value }: { value: string | Inline[] }) {
  if (typeof value === "string") return value;
  return value.map((piece, i) => {
    if (typeof piece === "string") return piece;
    if (piece.href) {
      return (
        <a key={i} href={piece.href} lang={piece.lang}>
          {piece.text}
        </a>
      );
    }
    return (
      <span key={i} lang={piece.lang}>
        {piece.text}
      </span>
    );
  });
}
