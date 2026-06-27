import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_STATUS_COLORS } from "../lib/constants";
import { Status } from "../app/types";

export type FontFamily = "sans" | "mono" | "serif" | "outfit" | "roboto" | "playfair";
export type Density = "comfortable" | "compact";
export type BackgroundStyle = "solid" | "grid" | "animated" | "diagonal" | "plus";

interface ThemeSettingsState {
  fontFamily: FontFamily;
  density: Density;
  backgroundStyle: BackgroundStyle;
  statusColors: Record<Status, string>;
  setFontFamily: (font: FontFamily) => void;
  setDensity: (density: Density) => void;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setStatusColor: (status: Status, color: string) => void;
}

const defaultState: ThemeSettingsState = {
  fontFamily: "sans",
  density: "comfortable",
  backgroundStyle: "solid",
  statusColors: DEFAULT_STATUS_COLORS,
  setFontFamily: () => {},
  setDensity: () => {},
  setBackgroundStyle: () => {},
  setStatusColor: () => {},
};

const ThemeSettingsContext = createContext<ThemeSettingsState>(defaultState);

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(
    (localStorage.getItem("fontFamily") as FontFamily) || "sans"
  );
  const [density, setDensityState] = useState<Density>(
    (localStorage.getItem("density") as Density) || "comfortable"
  );
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>(
    (localStorage.getItem("backgroundStyle") as BackgroundStyle) || "solid"
  );
  
  const [statusColors, setStatusColorsState] = useState<Record<Status, string>>(() => {
    const saved = localStorage.getItem("statusColors");
    if (saved) {
      try {
        return { ...DEFAULT_STATUS_COLORS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_STATUS_COLORS;
      }
    }
    return DEFAULT_STATUS_COLORS;
  });

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font);
    localStorage.setItem("fontFamily", font);
  };

  const setDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem("density", d);
  };

  const setBackgroundStyle = (style: BackgroundStyle) => {
    setBackgroundStyleState(style);
    localStorage.setItem("backgroundStyle", style);
  };

  const setStatusColor = (status: Status, color: string) => {
    setStatusColorsState((prev) => {
      const next = { ...prev, [status]: color };
      localStorage.setItem("statusColors", JSON.stringify(next));
      return next;
    });
  };

  return (
    <ThemeSettingsContext.Provider
      value={{
        fontFamily,
        density,
        backgroundStyle,
        statusColors,
        setFontFamily,
        setDensity,
        setBackgroundStyle,
        setStatusColor,
      }}
    >
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings() {
  return useContext(ThemeSettingsContext);
}
