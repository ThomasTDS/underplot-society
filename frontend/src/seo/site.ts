import "server-only";
import { connection } from "next/server";
import { siteConfigFrom, type SiteConfig } from "./config";

export type { SiteConfig } from "./config";

/** The site config at request time (see config.ts). */
export async function getSiteConfig(): Promise<SiteConfig> {
  await connection();
  return siteConfigFrom(process.env);
}
