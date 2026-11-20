import { notFound } from "next/navigation";
import { InstitutionalPage, institutionalMetadata } from "@/components/InstitutionalPage";
import { isLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/accessibility">) {
  return institutionalMetadata((await params).lang, "accessibility");
}

export default async function Page({ params }: PageProps<"/[lang]/accessibility">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <InstitutionalPage lang={lang} page="accessibility" />;
}
