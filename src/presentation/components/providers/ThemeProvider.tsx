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
import {
  getAppThemeById,
  getBoardThemeById,
  getKeyboardThemeById,
  type BackgroundSpec,
  type BoardColors,
  type KeyboardColors,
  type NeumorphicShadowSpec,
} from "../../themes/themeData";
import {
  hydrateThemeSelection,
  useThemeSelectionStore,
} from "../../stores/themeSelectionStore";
import { setAmbientSound, setSoundTheme, whenSoundPrefsReady } from "../../../utils/sound";

export type ThemeMode = "light" | "dark" | "system";

export type Theme = {
  mode: "light" | "dark";
  /** Latar GLOBAL (halaman) — gradien/gambar opsional di atas warna solid. */
  background?: BackgroundSpec;
  /** Bayangan neumorphic (opsional, PLAN-037) — dipakai elemen permukaan
   *  (kartu/panel/tombol) agar tampak "timbul". Hanya tema bergaya
   *  neumorphism yang membawanya; tema lain tidak terpengaruh. */
  shadow?: NeumorphicShadowSpec;
  /** Radius dasar permukaan (kartu/panel/input) — token SKIN (PLAN-038).
   *  Tema boleh mengubah untuk gaya berbeda; fallback 14. */
  radius?: number;
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
    /* ── Token SKIN generik (PLAN-038) — opsional, ada fallback di skin.ts ── */
    /** Overlay modal/dialog (fallback rgba(0,0,0,0.45)). */
    overlay?: string;
    /** Latar chip/badge (fallback secondaryContainer). */
    chipBackground?: string;
    /** Teks chip/badge (fallback secondary). */
    chipText?: string;
    /** Latar input (fallback surface). */
    inputBackground?: string;
    /** Border input (fallback border). */
    inputBorder?: string;
    /** Teks di atas warna primary (fallback #FFFFFF). */
    textOnPrimary?: string;
  };
};

interface ThemeContextValue {
  /** Palet GLOBAL aplikasi (dari tema aplikasi aktif, light/dark terselesaikan). */
  theme: Theme;
  /** Spec latar GLOBAL aplikasi (warna + gradien/gambar) untuk semua halaman. */
  background: BackgroundSpec;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  /** Tema aplikasi aktif (id). */
  appThemeId: string;
  setAppThemeId: (id: string) => Promise<void>;
  /** Tema PAPAN aktif (desain halaman game: papan, clue pill, panel hint). */
  boardThemeId: string;
  setBoardThemeId: (id: string) => Promise<void>;
  /** Palet papan untuk mode terang/gelap yang sedang berjalan. */
  boardColors: BoardColors;
  /** Spec latar HALAMAN GAME (dari tema papan aktif). */
  boardBackground: BackgroundSpec;
  /** Tema KEYBOARD aktif (InGameKeyboard). */
  keyboardThemeId: string;
  setKeyboardThemeId: (id: string) => Promise<void>;
  /** Palet keyboard untuk mode terang/gelap yang sedang berjalan. */
  keyboardColors: KeyboardColors;
  /** Spec latar panel KEYBOARD (dari tema keyboard aktif). */
  keyboardBackground: BackgroundSpec;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "kotakata_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  // Pilihan tema (app/board/keyboard) dari AsyncStorage — di-hydrate sekali.
  const themeSelectionHydrated = useThemeSelectionStore((s) => s.hydrated);
  const appThemeId = useThemeSelectionStore((s) => s.appThemeId);
  const boardThemeId = useThemeSelectionStore((s) => s.boardThemeId);
  const keyboardThemeId = useThemeSelectionStore((s) => s.keyboardThemeId);
  const setAppThemeId = useThemeSelectionStore((s) => s.setAppThemeId);
  const setBoardThemeId = useThemeSelectionStore((s) => s.setBoardThemeId);
  const setKeyboardThemeId = useThemeSelectionStore((s) => s.setKeyboardThemeId);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
    void hydrateThemeSelection();
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
  const isDark = resolvedMode === "dark";

  // Resolve palet dari registry tema (offline-first). Fallback otomatis ke
  // tema default "puitis" bila id tidak dikenal (lihat get*ThemeById).
  const appTheme = getAppThemeById(appThemeId);
  const theme = isDark ? appTheme.dark : appTheme.light;

  // Kepribadian suara + backsound mengikuti tema aplikasi aktif (SoundSpec &
  // AmbientSoundSpec). Backsound pertama kali ditunda sampai preferensi
  // tersimpan (efek suara & backsound) selesai dibaca — mencegah race: kalau
  // user mematikan suara di sesi sebelumnya, backsound tidak sempat berbunyi
  // sebelum preferensi diterapkan (lihat PLAN-021).
  useEffect(() => {
    let cancelled = false;
    void whenSoundPrefsReady().then(() => {
      if (cancelled) return;
      setSoundTheme(appTheme.sound);
      setAmbientSound(appTheme.ambient ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [appTheme]);
  // PLAN-033: tema papan & keyboard MENGIKUTI tema aplikasi. Kategori tema
  // papan/keyboard dihapus sementara dari Pasar (pemilik akan mendesain ulang
  // keduanya nanti). Id papan/keyboard dengan nama sama dengan tema aplikasi
  // (puitis/samudra/senja/hutan) di-resolve dari id tema aplikasi yang aktif
  // — jadi ganti tema aplikasi otomatis mewarnai papan & keyboard senada.
  const boardTheme = getBoardThemeById(appThemeId);
  const boardPalette = isDark ? boardTheme.dark : boardTheme.light;
  const boardColors = boardPalette;
  const keyboardTheme = getKeyboardThemeById(appThemeId);
  const keyboardPalette = isDark ? keyboardTheme.dark : keyboardTheme.light;
  const keyboardColors = keyboardPalette;

  // Spec latar: warna solid palet sebagai dasar + dekorasi (gradien/gambar)
  // dari field `background` tema — warna default diambil dari palet itu sendiri.
  const background: BackgroundSpec = { color: theme.colors.background, ...(theme.background ?? {}) };
  const boardBackground: BackgroundSpec = {
    color: boardPalette.boardBackground,
    ...(boardPalette.background ?? {}),
  };
  const keyboardBackground: BackgroundSpec = {
    color: keyboardPalette.panelBackground,
    ...(keyboardPalette.background ?? {}),
  };

  if (!loaded || !themeSelectionHydrated) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        background,
        themeMode,
        setThemeMode,
        isDark,
        appThemeId,
        setAppThemeId,
        boardThemeId,
        setBoardThemeId,
        boardColors,
        boardBackground,
        keyboardThemeId,
        setKeyboardThemeId,
        keyboardColors,
        keyboardBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  }
  return ctx;
}
