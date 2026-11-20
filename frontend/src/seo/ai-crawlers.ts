import aiCrawlers from "./ai-crawlers.json";

/**
 * AI crawlers asked to stay away: those that collect text to train models, those that
 * fetch pages for an assistant, and the robots.txt-only tokens (Google-Extended,
 * Applebot-Extended) that opt out of AI use by search crawlers. Search crawlers, AI
 * search included, stay allowed, so the site can be found and cited with a link.
 *
 * robots.txt is a request, not a lock: the same list is blocked at the edge by
 * Cloudflare (deploy/cloudflare/configure.py).
 */
export const AI_CRAWLERS_DISALLOWED: string[] = [...aiCrawlers.training, ...aiCrawlers.agents, ...aiCrawlers.robotsOnly];

export { aiCrawlers };
