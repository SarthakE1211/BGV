"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

export type Theme = "light" | "dark";

interface ThemeCtx {
    theme: Theme;
    setTheme: (t: Theme) => void;
    toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** Wraps the app. Persists theme to localStorage under "bgv-theme". Must
 *  render on the client, but the initial state comes from the inline script
 *  in layout.tsx so there's no flash of the wrong theme on first paint. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");

    // Read what the bootstrap script already wrote to <html data-theme>.
    useEffect(() => {
        const attr = document.documentElement.getAttribute("data-theme");
        if (attr === "dark" || attr === "light") setThemeState(attr);
    }, []);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        document.documentElement.setAttribute("data-theme", t);
        try {
            localStorage.setItem("bgv-theme", t);
        } catch {
            /* private mode / quota — ignore */
        }
    }, []);

    const toggle = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [theme, setTheme]);

    return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
    return ctx;
}

/** Synchronous pre-hydration script. Injected at the top of <body> so
 *  <html data-theme> is set BEFORE any CSS applies — prevents FOUC. */
export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("bgv-theme");
    var preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (preferDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;
