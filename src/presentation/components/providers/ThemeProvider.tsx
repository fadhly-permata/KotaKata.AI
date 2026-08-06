import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

export type Theme = {
  mode: "light" | "dark";
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    secondary: string;
    secondaryContainer: string;
    tertiary: string;
    tertiaryContainer: string;
    accent: string;
    gold: string;
    success: string;
    error: string;
    cellActive: string;
    cellBorder: string;
    cellText: string;
    cellBlocked: string;
    cellLocked: string;
    cellSolved: string;
    cellSolvedText: string;
  };
};

const lightTheme: Theme = {
  mode: "light",
  colors: {
    background: "#fef7ff", // very light pink-white — warm & playful
    surface: "#ffffff",
    text: "#2e1a28",
    textSecondary: "#604868",
    border: "#dcc8e0",
    primary: "#e040a0", // hot pink — brand identity
    secondary: "#7c52aa", // purple — secondary elements
    secondaryContainer: "#eedcff", // light purple bg
    tertiary: "#0096cc", // sky blue — informational
    tertiaryContainer: "#40c0ee", // light sky blue bg
    accent: "#e040a0", // hot pink
    gold: "#FDCB6E",
    success: "#00B894",
    error: "#e53e3e",
    cellActive: "#ffffff",
    cellBorder: "#dcc8e0",
    cellText: "#2e1a28",
    cellBlocked: "#2e1a28",
    cellLocked: "#dcc8e0",
    cellSolved: "#ffd6ee", // pink muda — sama dengan warna pill XP
    cellSolvedText: "#a02070",
  },
};

const darkTheme: Theme = {
  mode: "dark",
  colors: {
    background: "#1a1020", // deep plum
    surface: "#2a1a30",
    text: "#fef7ff",
    textSecondary: "#b8a0b8",
    border: "#4a3850",
    primary: "#f0a0cc", // soft hot pink
    secondary: "#c8a8e8", // light purple
    secondaryContainer: "#3a2850", // dark purple bg
    tertiary: "#80d0f0", // light sky blue
    tertiaryContainer: "#004466", // dark blue bg
    accent: "#f0a0cc",
    gold: "#F9CA24",
    success: "#55EFC4",
    error: "#ff6b6b",
    cellActive: "#2a1a30",
    cellBorder: "#4a3850",
    cellText: "#fef7ff",
    cellBlocked: "#1a1020",
    cellLocked: "#4a3850",
    cellSolved: "#47203f", // pink gelap — konsisten dengan identitas brand
    cellSolvedText: "#f0a0cc",
  },
};

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: "system",
  setThemeMode: async () => {},
  isDark: false,
});

const STORAGE_KEY = "kotakata_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const resolvedMode =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const theme = resolvedMode === "dark" ? darkTheme : lightTheme;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, isDark: resolvedMode === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
