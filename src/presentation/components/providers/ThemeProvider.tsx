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
    background: "#F8F6F0", // warm cream
    surface: "#FFFFFF",
    text: "#2D3436",
    textSecondary: "#8E99A4",
    border: "#E8E2D9",
    primary: "#6C5CE7", // indigo
    secondary: "#7c52aa", // purple
    secondaryContainer: "#eedcff", // light purple bg
    accent: "#00B894", // emerald
    gold: "#FDCB6E",
    success: "#00B894",
    error: "#E17055",
    cellActive: "#FFFFFF",
    cellBorder: "#E8E2D9",
    cellText: "#2D3436",
    cellBlocked: "#2D3436",
    cellLocked: "#E8E2D9",
    cellSolved: "#E8F8F3",
    cellSolvedText: "#00B894",
  },
};

const darkTheme: Theme = {
  mode: "dark",
  colors: {
    background: "#0F0E17", // deep navy
    surface: "#1A1926",
    text: "#F5F5F5",
    textSecondary: "#8E99A4",
    border: "#2A2938",
    primary: "#A29BFE", // soft purple
    secondary: "#c8a8e8", // light purple
    secondaryContainer: "#4a3068", // dark purple bg
    accent: "#55EFC4", // mint
    gold: "#F9CA24",
    success: "#55EFC4",
    error: "#FF6B6B",
    cellActive: "#1A1926",
    cellBorder: "#2A2938",
    cellText: "#F5F5F5",
    cellBlocked: "#0F0E17",
    cellLocked: "#2A2938",
    cellSolved: "#1A3A2E",
    cellSolvedText: "#55EFC4",
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
