import { create } from "zustand";
import { DEFAULT_APP_THEME_ID } from "../themes/themeData";
import { userRepository } from "../../data/repositories/userRepository";

/**
 * Pilihan tema user (yang mana yang aktif) — disimpan HANYA di cloud (Supabase).
 * Tidak ada AsyncStorage local — setiap perubahan langsung ke cloud.
 *
 * Hydrate dilakukan oleh RootNavigator saat login: baca dari cloud → set state.
 */

interface ThemeSelectionState {
  appThemeId: string;
  /** True setelah cloud sync selesai (ThemeProvider menunggu flag ini). */
  hydrated: boolean;
  setAppThemeId: (id: string, userId?: string) => Promise<void>;
}

export const useThemeSelectionStore = create<ThemeSelectionState>((set, get) => ({
  appThemeId: DEFAULT_APP_THEME_ID,
  hydrated: true,

  setAppThemeId: async (id: string, userId?: string) => {
    set({ appThemeId: id });
    // Simpan ke cloud (fire-and-forget)
    if (userId) {
      void userRepository.saveAppThemeId(userId, id).catch(() => {});
    }
  },
}));

/**
 * Set hydrated flag (dipanggil oleh RootNavigator setelah cloud sync selesai).
 */
export function markThemeHydrated(): void {
  useThemeSelectionStore.setState({ hydrated: true });
}
