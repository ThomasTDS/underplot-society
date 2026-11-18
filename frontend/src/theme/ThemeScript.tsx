import { themeInitScript } from "./theme";

/** Put inside <head>: applies a saved theme before the first paint. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
