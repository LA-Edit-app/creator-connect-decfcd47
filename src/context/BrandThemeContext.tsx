import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BrandThemeId = "laedit-violet" | "olive-blond" | "midnight-gold" | "coral-pulse";

export type BrandThemeDefinition = {
  id: BrandThemeId;
  name: string;
  description: string;
  tokens: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
    sidebarPrimary: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    statIconBg: string;
    statIconColor: string;
    chartArea: string;
    chartLine: string;
    cardDecoration: string;
  };
};

const THEME_STORAGE_KEY = "laedit.brand-theme";

export const BRAND_THEMES: BrandThemeDefinition[] = [
  {
    id: "laedit-violet",
    name: "LA Edit Violet",
    description: "Original studio palette with vibrant violet accents.",
    tokens: {
      primary: "262 83% 58%",
      primaryForeground: "0 0% 100%",
      accent: "262 83% 58%",
      accentForeground: "0 0% 100%",
      ring: "262 83% 58%",
      sidebarPrimary: "262 83% 58%",
      sidebarAccent: "262 60% 97%",
      sidebarAccentForeground: "262 83% 50%",
      statIconBg: "262 60% 95%",
      statIconColor: "262 83% 58%",
      chartArea: "262 83% 58%",
      chartLine: "262 75% 50%",
      cardDecoration: "262 30% 94%",
    },
  },
  {
    id: "olive-blond",
    name: "Olive Blond",
    description: "Warm olive-blond tones for editorial and beauty-forward work.",
    tokens: {
      primary: "44 34% 61%",
      primaryForeground: "45 35% 12%",
      accent: "52 28% 67%",
      accentForeground: "45 30% 14%",
      ring: "44 34% 61%",
      sidebarPrimary: "44 34% 61%",
      sidebarAccent: "48 30% 93%",
      sidebarAccentForeground: "44 30% 32%",
      statIconBg: "48 30% 90%",
      statIconColor: "44 34% 45%",
      chartArea: "44 34% 58%",
      chartLine: "40 30% 43%",
      cardDecoration: "45 24% 90%",
    },
  },
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    description: "Premium dark-luxe mood with gold accents.",
    tokens: {
      primary: "42 88% 56%",
      primaryForeground: "230 30% 12%",
      accent: "44 82% 62%",
      accentForeground: "230 28% 14%",
      ring: "42 88% 56%",
      sidebarPrimary: "42 88% 56%",
      sidebarAccent: "230 20% 95%",
      sidebarAccentForeground: "230 25% 26%",
      statIconBg: "44 50% 92%",
      statIconColor: "42 88% 45%",
      chartArea: "42 88% 56%",
      chartLine: "37 82% 42%",
      cardDecoration: "42 45% 90%",
    },
  },
  {
    id: "coral-pulse",
    name: "Coral Pulse",
    description: "Energetic social-first palette with coral highlights.",
    tokens: {
      primary: "8 86% 63%",
      primaryForeground: "0 0% 100%",
      accent: "14 86% 66%",
      accentForeground: "0 0% 100%",
      ring: "8 86% 63%",
      sidebarPrimary: "8 86% 63%",
      sidebarAccent: "10 80% 96%",
      sidebarAccentForeground: "8 62% 42%",
      statIconBg: "10 90% 94%",
      statIconColor: "8 86% 58%",
      chartArea: "8 86% 63%",
      chartLine: "5 76% 49%",
      cardDecoration: "12 65% 91%",
    },
  },
];

type BrandThemeContextValue = {
  themes: BrandThemeDefinition[];
  activeThemeId: BrandThemeId;
  setActiveThemeId: (themeId: BrandThemeId) => void;
  activeTheme: BrandThemeDefinition;
};

const BrandThemeContext = createContext<BrandThemeContextValue | null>(null);

const applyThemeTokens = (theme: BrandThemeDefinition) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--primary", theme.tokens.primary);
  root.style.setProperty("--primary-foreground", theme.tokens.primaryForeground);
  root.style.setProperty("--accent", theme.tokens.accent);
  root.style.setProperty("--accent-foreground", theme.tokens.accentForeground);
  root.style.setProperty("--ring", theme.tokens.ring);
  root.style.setProperty("--sidebar-primary", theme.tokens.sidebarPrimary);
  root.style.setProperty("--sidebar-accent", theme.tokens.sidebarAccent);
  root.style.setProperty("--sidebar-accent-foreground", theme.tokens.sidebarAccentForeground);
  root.style.setProperty("--stat-icon-bg", theme.tokens.statIconBg);
  root.style.setProperty("--stat-icon-color", theme.tokens.statIconColor);
  root.style.setProperty("--chart-area", theme.tokens.chartArea);
  root.style.setProperty("--chart-line", theme.tokens.chartLine);
  root.style.setProperty("--card-decoration", theme.tokens.cardDecoration);
};

export const BrandThemeProvider = ({ children }: { children: ReactNode }) => {
  const [activeThemeId, setActiveThemeId] = useState<BrandThemeId>(() => {
    if (typeof window === "undefined") return "laedit-violet";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as BrandThemeId | null;
    return BRAND_THEMES.some((theme) => theme.id === saved) ? saved : "laedit-violet";
  });

  const activeTheme = useMemo(
    () => BRAND_THEMES.find((theme) => theme.id === activeThemeId) ?? BRAND_THEMES[0],
    [activeThemeId]
  );

  useEffect(() => {
    applyThemeTokens(activeTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme.id);
    }
  }, [activeTheme]);

  const value = useMemo<BrandThemeContextValue>(
    () => ({
      themes: BRAND_THEMES,
      activeThemeId,
      setActiveThemeId,
      activeTheme,
    }),
    [activeTheme, activeThemeId]
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
};

export const useBrandTheme = () => {
  const context = useContext(BrandThemeContext);
  if (!context) {
    throw new Error("useBrandTheme must be used within a BrandThemeProvider");
  }
  return context;
};
