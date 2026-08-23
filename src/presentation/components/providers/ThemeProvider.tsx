import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useColorScheme, Platform } from "react-native";
import {
  getAppThemeById,
  getBoardThemeById,
  getKeyboardThemeById,
  type AmbientFxKind,
  type BackgroundSpec,
  type BoardColors,
  type KeyboardColors,
  type NeumorphicShadowSpec,
} from "../../themes/themeData";
import { useThemeSelectionStore } from "../../stores/themeSelectionStore";
import { setAmbientSound, setSoundTheme, whenSoundPrefsReady } from "../../../utils/sound";
import { useAuth } from "../../../features/auth/useAuth";

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
  /** Efek latar ambien yang mengikuti SUASANA backsound tema (PLAN-044):
   *  rain/wind/embers/fireflies/waves/breeze — menggantikan orb saat ada. */
  ambientFx?: AmbientFxKind;
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
  /** Palet papan untuk mode terang/gelap yang sedang berjalan. */
  boardColors: BoardColors;
  /** Spec latar HALAMAN GAME (dari tema papan aktif). */
  boardBackground: BackgroundSpec;
  /** Tema KEYBOARD aktif (InGameKeyboard). */
  /** Palet keyboard untuk mode terang/gelap yang sedang berjalan. */
  keyboardColors: KeyboardColors;
  /** Spec latar panel KEYBOARD (dari tema keyboard aktif). */
  keyboardBackground: BackgroundSpec;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  // Pilihan tema dari cloud (di-sync oleh RootNavigator saat login).
  const themeSelectionHydrated = useThemeSelectionStore((s) => s.hydrated);
  const appThemeId = useThemeSelectionStore((s) => s.appThemeId);
  const setAppThemeIdRaw = useThemeSelectionStore((s) => s.setAppThemeId);
  // Wrap: automatically pass userId for cloud save
  const setAppThemeId = useCallback(async (id: string) => {
    await setAppThemeIdRaw(id, user?.id);
  }, [setAppThemeIdRaw, user?.id]);

  useEffect(() => {
    // Default: "system". Cloud sync dijalankan oleh RootNavigator saat login.
    setLoaded(true);
  }, []);

  // Dengarkan event dari RootNavigator saat cloud sync selesai.
  // Update theme mode dari cloud.
  // CATATAN: addEventListener hanya ada di WEB. Di Hermes/RN native, objek
  // `window` ADA tetapi `window.addEventListener` TIDAK terdefinisi — guard
  // lama (`typeof window !== "undefined"`) lolos lalu crash dengan
  // "TypeError: undefined is not a function" saat mount (penyebab layar
  // error/putih di APK). Cek fungsi listener-nya secara eksplisit.
  useEffect(() => {
    const w =
      typeof window !== "undefined"
        ? (window as unknown as {
            addEventListener?: (type: string, listener: (e: Event) => void) => void;
            removeEventListener?: (type: string, listener: (e: Event) => void) => void;
          })
        : undefined;
    const addListener = w?.addEventListener;
    const removeListener = w?.removeEventListener;
    if (typeof addListener === "function" && typeof removeListener === "function") {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.theme_mode === "light" || detail?.theme_mode === "dark" || detail?.theme_mode === "system") {
          setThemeModeState(detail.theme_mode);
        }
      };
      addListener("kotakata:cloudPrefsLoaded", handler);
      return () => removeListener("kotakata:cloudPrefsLoaded", handler);
    }
    // Native: tidak ada event bus window — sinkron tema dari cloud tetap
    // berjalan lewat store zustand (themeSelectionStore), jadi aman tanpa ini.
    return;
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    // Cloud sync dilakukan oleh SettingsScreen (fire-and-forget)
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
  // ambientFx (PLAN-044) dibawa di level DEFINISI tema (bukan per mode) —
  // disuntikkan ke tema ter-resolve supaya ScreenFade tinggal membacanya.
  const theme: Theme = {
    ...(isDark ? appTheme.dark : appTheme.light),
    ambientFx: appTheme.ambientFx,
  };

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
  // Web: warnai latar <body> & matikan overscroll — saat scroll mentok
  // atas/bawah, browser menampilkan latar di BALIK app yang default-nya PUTIH
  // ("kotak putih" mengganggu). Dengan body dicat warna tema + rubber-band
  // dimatikan, area itu tidak pernah terlihat lagi.
  // Aturan #5b: guard FUNGSI eksplisit (document ada) — Hermes punya window
  // tapi tidak punya document; native tidak melakukan apa pun.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof document === "undefined" || !document.body) return;
    document.body.style.backgroundColor = theme.colors.background;
    document.documentElement.style.overscrollBehavior = "none";
  }, [theme.colors.background]);
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
        boardColors,
        boardBackground,
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
