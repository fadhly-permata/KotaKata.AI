import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_APP_THEME_ID } from "../themes/themeData";

/**
 * Pilihan tema user (yang mana yang aktif) — dipisah dari ThemeProvider supaya
 * layar lain (Pasar/Store) bisa ikut membaca & mengubah pilihan tanpa perlu
 * masuk ke provider. Yang tersimpan di sini HANYA id tema; paletnya di-resolve
 * dari registry (themeData.ts) oleh ThemeProvider.
 *
 * Pilihan di-persist ke AsyncStorage manual (bukan middleware persist zustand)
 * supaya pola hydrasinya seragam dengan ThemeProvider (themeMode) dan tidak
 * membutuhkan `createJSONStorage` lintas platform.
 *
 * Sejak PLAN-033, board/keyboard themes MENGIKUTI tema aplikasi — tidak ada
 * pemilihan terpisah. Kolom board_theme_id/keyboard_theme_id dihapus dari
 * store dan tabel users Supabase.
 */

interface ThemeSelectionState {
  appThemeId: string;
  /** True setelah pilihan dari AsyncStorage selesai dimuat (ThemeProvider
   *  menunggu flag ini sebelum me-render konten, menghindari kedipan tema). */
  hydrated: boolean;
  setAppThemeId: (id: string) => Promise<void>;
}

const STORAGE_KEY = "kotakata_theme_selection";

export const useThemeSelectionStore = create<ThemeSelectionState>((set, get) => ({
  appThemeId: DEFAULT_APP_THEME_ID,
  hydrated: false,

  setAppThemeId: async (id: string) => {
    set({ appThemeId: id });
    await persistSelection(get());
  },
}));

/** Simpan pilihan tema (hanya appThemeId — board/keyboard mengikuti). */
async function persistSelection(state: Pick<ThemeSelectionState, "appThemeId">): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        appThemeId: state.appThemeId,
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
      const parsed = JSON.parse(raw) as Partial<Pick<ThemeSelectionState, "appThemeId">>;
      useThemeSelectionStore.setState({
        appThemeId: typeof parsed.appThemeId === "string" ? parsed.appThemeId : DEFAULT_APP_THEME_ID,
      });
    }
  } catch {
    // Data korup → biarkan default.
  } finally {
    useThemeSelectionStore.setState({ hydrated: true });
  }
}
