"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("cf-theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="cf-mono rounded border border-line px-2 py-1 text-[11px] text-ink-mute transition-colors hover:border-ink-faint hover:text-ink"
      aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
