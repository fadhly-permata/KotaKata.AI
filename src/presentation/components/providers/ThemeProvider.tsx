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
    cellActive: string;
    cellBorder: string;
    cellText: string;
    cellBlocked: string;
    cellLocked: string;
  };
};

const lightTheme: Theme = {
  mode: "light",
  colors: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#1A1A2E",
    textSecondary: "#666680",
    border: "#E0E0E0",
    primary: "#4A90D9",
    cellActive: "#FFFFFF",
    cellBorder: "#E0E0E0",
    cellText: "#1A1A2E",
    cellBlocked: "#333333",
    cellLocked: "#D3D3D3",
  },
};

const darkTheme: Theme = {
  mode: "dark",
  colors: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#F5F5F5",
    textSecondary: "#AAAAAA",
    border: "#333333",
    primary: "#6BB3F0",
    cellActive: "#1E1E1E",
    cellBorder: "#333333",
    cellText: "#F5F5F5",
    cellBlocked: "#121212",
    cellLocked: "#2A2A2A",
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
