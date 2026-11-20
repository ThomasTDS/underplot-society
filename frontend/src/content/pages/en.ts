import { links } from "./links";
import type { InstitutionalPages } from "./types";

export const pages: InstitutionalPages = {
  about: {
    title: "About",
    description: "What Underplot Society is, who writes it and why.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "Every game has two stories: the one on the screen, and the one that got it there. Underplot Society exists to tell the second.",
    ],
    sections: [
      {
        heading: "The name",
        blocks: [
          "An underplot is the secondary plot, the one running beneath the main story. That is what this site looks for in games: the decisions, mistakes and wins nobody sees from the outside. Hence the motto, Beneath the Surface.",
        ],
      },
      {
        heading: "What you will find here",
        blocks: [
          "Articles on how games are made and sold, one area at a time:",
          {
            list: [
              "development, design and quality assurance (QA);",
              "product, marketing and sales;",
              "managing teams and projects.",
            ],
          },
          "Everything in English, Portuguese and Spanish.",
        ],
      },
      {
        heading: "Who writes it",
        blocks: [
          "T.T.Ravenstone. The site itself is built in public: the code is open and every decision is on record.",
        ],
      },
      {
        heading: "Manifesto",
        blocks: ["The manifesto will be published here."],
      },
    ],
  },

  privacy: {
    title: "Privacy",
    description: "What data this site handles, why and with whom, under Brazil's data protection law (LGPD).",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "In short: this site does not ask for, collect or sell personal data. There are no accounts, forms, comments, ads or tracking. Below is, in detail, everything that happens when you visit.",
    ],
    sections: [
      {
        heading: "When you open a page",
        blocks: [
          "As with any website, your browser sends your IP address and a browser identifier. They are used only to deliver the page and to protect the site from abuse:",
          {
            list: [
              [
                { text: "Cloudflare", href: links.cloudflarePrivacy },
                " receives the visit first, to deliver the site securely (HTTPS certificate and protection from attacks), under its own privacy policy;",
              ],
              ["the server runs on ", { text: "Oracle Cloud", href: links.oraclePrivacy }, ";"],
              "for reading the site, the site itself does not use your IP address, and it keeps no access logs;",
              "if you call the site's public API directly, from a program, your IP address is used only to limit excessive requests. It is stored only as a code made with a secret key, which cannot be turned back into the address, and deleted a few minutes later.",
            ],
          },
          "Legal basis: legitimate interest (LGPD, art. 7, IX), to keep the site up and secure. As these services run servers in other countries, the data may be processed outside Brazil.",
        ],
      },
      {
        heading: "Cookies and browser storage",
        blocks: [
          {
            list: [
              "The locale cookie: set only if you pick a language in the switcher. It holds only the language (for example, en), for a year, so the site opens in it next time.",
              "Light or dark theme: your choice is kept in your browser only and never sent to the site.",
            ],
          },
          "There are no other cookies: no analytics, advertising or social media cookies.",
        ],
      },
      {
        heading: "What the site does not load",
        blocks: [
          "Nothing from any other address: fonts, images and scripts all come from the site itself. An automated test checks this on every code change.",
          "There are no audience metrics today. If they are added, they will be cookieless and free of personal data, and this page will be updated first.",
        ],
      },
      {
        heading: "Newsletter",
        blocks: [
          [
            "The newsletter runs on Substack. The link takes you to their site, and you subscribe there: this site never sees or stores your email address. What Substack does with it follows ",
            { text: "Substack's privacy policy", href: links.substackPrivacy },
            ".",
          ],
        ],
      },
      {
        heading: "Your rights",
        blocks: [
          "Under the LGPD, you may ask for confirmation that your data is processed, and for access, correction or deletion, among other rights (art. 18). As the site keeps no personal data about readers, there is in practice nothing to look up or delete here. To remove the language cookie, clear the site's cookies in your browser.",
          "A contact channel will be published here before the site launches.",
        ],
      },
    ],
  },

  accessibility: {
    title: "Accessibility",
    description: "The site's accessibility commitment, what is checked and what is still missing.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "This site aims to be usable by everyone, with any browser, keyboard, screen reader or magnification. The target is level AA of the Web Content Accessibility Guidelines (WCAG) 2.2.",
    ],
    sections: [
      {
        heading: "What is checked",
        blocks: [
          "On every code change, automated tests check, in all three languages and both themes:",
          {
            list: [
              "enough colour contrast;",
              "full use by keyboard, with the focus always visible and a link to skip straight to the content;",
              "headings in order and page regions identified;",
              "reading without sideways scrolling at up to 400% zoom and with increased text spacing;",
              "the right language on every passage, so screen readers pronounce it correctly;",
              "no animation when the system asks for reduced motion.",
            ],
          },
          ["The full report is in the ", { text: "site's public repository", href: links.accessibilityReport }, "."],
        ],
      },
      {
        heading: "Known limitations",
        blocks: [
          {
            list: [
              "Words in another language inside an article cannot be marked as such yet, so a screen reader may pronounce them with the wrong accent.",
              "Manual testing with screen readers is under way.",
            ],
          },
        ],
      },
      {
        heading: "Found a barrier?",
        blocks: [
          "Every barrier reported is treated as a defect to fix. A contact channel will be published here before the site launches.",
        ],
      },
    ],
  },
};
