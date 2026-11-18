import { Suspense } from "react";
import styles from "@/components/articles/articles.module.css";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";

/**
 * Article slugs are only known at request time. This layout sees just the language
 * (not the slug), so it can show a translated placeholder while an article page
 * streams in. The list page renders its own shell and never shows it.
 */
export default async function ArticlesLayout({ children, params }: LayoutProps<"/[lang]/articles">) {
  const { lang } = await params;
  const labels = getMessages(isLocale(lang) ? lang : "en").articles;

  return (
    <Suspense fallback={<p className={styles.article}>{labels.loadingArticle}</p>}>{children}</Suspense>
  );
}
