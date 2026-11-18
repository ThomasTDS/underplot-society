"use client";

import { useSyncExternalStore } from "react";
import type { Messages } from "@/i18n/dictionaries";
import { readThemeChoice, setThemeChoice, subscribeThemeChoice, themeChoices } from "./theme";
import styles from "./ThemeSwitcher.module.css";

export type ThemeLabels = Messages["theme"];

/** Native radio buttons: arrow keys move between options, and screen readers announce the group. */
export function ThemeSwitcher({ labels }: { labels: ThemeLabels }) {
  // The server cannot know the saved choice, so nothing is checked until hydration.
  const choice = useSyncExternalStore(subscribeThemeChoice, readThemeChoice, () => null);

  return (
    <fieldset className={styles.switcher}>
      <legend className={styles.legend}>{labels.legend}</legend>
      {themeChoices.map((option) => (
        <label key={option} className={styles.option}>
          <input
            type="radio"
            name="theme"
            value={option}
            checked={choice === option}
            onChange={() => setThemeChoice(option)}
            className={styles.input}
          />
          {labels[option]}
        </label>
      ))}
    </fieldset>
  );
}
