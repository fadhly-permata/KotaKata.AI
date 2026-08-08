import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Identitas guest berbasis device (cara #3 yang direkomendasikan):
 *
 * UUID acak dibuat saat app pertama kali dibuka, lalu disimpan permanen di
 * AsyncStorage (native) / localStorage (web). Nilai ini dipakai sebagai
 * "jangkar" identitas tamu: saat session anonim Supabase berganti (mis. session
 * hilang atau data auth terhapus), UUID yang sama membuat riwayat kata yang
 * sudah ditemukan + XP + board bisa dipulihkan ke uid anonim yang baru — lihat
 * userRepository.restoreGuestIdentity().
 *
 * Tidak butuh permission apa pun, tidak menyentuh MAC/IMEI, dan stabil per
 * device selama data app tidak dihapus total (factory reset / reinstall).
 */

const DEVICE_ID_KEY = "kotakata.device_id";

let cached: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch {
    // Storage tidak tersedia (mis. mode pribadi browser) — lanjut generate ID baru.
  }

  const id = uuidv4();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Gagal persist: ID tetap dipakai untuk sesi ini saja.
  }
  cached = id;
  return id;
}
