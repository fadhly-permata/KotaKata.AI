import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_APP_THEME_ID,
  DEFAULT_BOARD_THEME_ID,
  DEFAULT_KEYBOARD_THEME_ID,
} from "../themes/themeData";

/**
 * Pilihan tema user (yang mana yang aktif) — dipisah dari ThemeProvider supaya
 * layar lain (Pasar/Store) bisa ikut membaca & mengubah pilihan tanpa perlu
 * masuk ke provider. Yang tersimpan di sini HANYA id tema; paletnya di-resolve
 * dari registry (themeData.ts) oleh ThemeProvider.
 *
 * Pilihan di-persist ke AsyncStorage manual (bukan middleware persist zustand)
 * supaya pola hydrasinya seragam dengan ThemeProvider (themeMode) dan tidak
 * membutuhkan `createJSONStorage` lintas platform.
 */

interface ThemeSelectionState {
  appThemeId: string;
  boardThemeId: string;
  keyboardThemeId: string;
  /** True setelah pilihan dari AsyncStorage selesai dimuat (ThemeProvider
   *  menunggu flag ini sebelum me-render konten, menghindari kedipan tema). */
  hydrated: boolean;
  setAppThemeId: (id: string) => Promise<void>;
  setBoardThemeId: (id: string) => Promise<void>;
  setKeyboardThemeId: (id: string) => Promise<void>;
}

const STORAGE_KEY = "kotakata_theme_selection";

export const useThemeSelectionStore = create<ThemeSelectionState>((set, get) => ({
  appThemeId: DEFAULT_APP_THEME_ID,
  boardThemeId: DEFAULT_BOARD_THEME_ID,
  keyboardThemeId: DEFAULT_KEYBOARD_THEME_ID,
  hydrated: false,

  setAppThemeId: async (id: string) => {
    set({ appThemeId: id });
    await persistSelection(get());
  },

  setBoardThemeId: async (id: string) => {
    set({ boardThemeId: id });
    await persistSelection(get());
  },

  setKeyboardThemeId: async (id: string) => {
    set({ keyboardThemeId: id });
    await persistSelection(get());
  },
}));

/** Simpan ketiga pilihan sekaligus (satu key AsyncStorage). */
async function persistSelection(state: Pick<ThemeSelectionState, "appThemeId" | "boardThemeId" | "keyboardThemeId">): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        appThemeId: state.appThemeId,
        boardThemeId: state.boardThemeId,
        keyboardThemeId: state.keyboardThemeId,
      }),
    );
  } catch {
    // Gagal persist tidak fatal — pilihan tetap berlaku untuk sesi ini.
  }
}

/**
 * Muat pilihan tersimpan dari AsyncStorage lalu tandai `hydrated`.
 * Dipanggil sekali oleh ThemeProvider saat mount. Id yang tidak dikenal
 * (mis. tema dihapus dari registry) diabaikan → kembali ke default.
 */
export async function hydrateThemeSelection(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Pick<ThemeSelectionState, "appThemeId" | "boardThemeId" | "keyboardThemeId">>;
      useThemeSelectionStore.setState({
        appThemeId: typeof parsed.appThemeId === "string" ? parsed.appThemeId : DEFAULT_APP_THEME_ID,
        boardThemeId: typeof parsed.boardThemeId === "string" ? parsed.boardThemeId : DEFAULT_BOARD_THEME_ID,
        keyboardThemeId: typeof parsed.keyboardThemeId === "string" ? parsed.keyboardThemeId : DEFAULT_KEYBOARD_THEME_ID,
      });
    }
  } catch {
    // Data korup → biarkan default.
  } finally {
    useThemeSelectionStore.setState({ hydrated: true });
  }
}
