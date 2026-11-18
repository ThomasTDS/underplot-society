import localFont from "next/font/local";

// Self-hosted from the Fontsource packages (OFL-1.1): no request to Google or any
// other third party, so no visitor data leaves the site. The Latin subset covers
// English, Portuguese and Spanish. next/font also adds a metrics-matched fallback,
// so text does not jump when the font arrives.

export const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});

export const spaceGrotesk = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-space-grotesk",
});

/** Classes that define both font variables; put them on <html>. */
export const fontVariables = `${inter.variable} ${spaceGrotesk.variable}`;
