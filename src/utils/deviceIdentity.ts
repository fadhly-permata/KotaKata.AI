import AsyncStorage from "@react-native-async-storage/async-storage";
import { loggerWarn } from "./logger";

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
  } catch (err) {
    loggerWarn("Gagal membaca device ID dari storage", err);
  }

  const id = generateUuid();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch (err) {
    loggerWarn("Gagal menyimpan device ID ke storage", err);
  }
  cached = id;
  return id;
}

/**
 * UUID v4 (RFC 4122) tanpa dependensi eksternal.
 *
 * Package `uuid` butuh `crypto` global (randomUUID/getRandomValues) yang tidak
 * tersedia di Hermes/React Native ("property 'crypto' doesn't exist"). Di sini
 * dipakai `crypto.getRandomValues` kalau ada (web/Node), dan fallback
 * `Math.random` di native — cukup aman untuk identitas perangkat (bukan
 * kredensial/kunci kriptografis).
 */
function generateUuid(): string {
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => void } })
    .crypto;
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Version 4 + variant 10 (RFC 4122).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Hapus identitas device — dipakai saat user menghapus akun permanen, supaya
 * guest berikutnya di device yang sama benar-benar mulai dari nol (tanpa
 * risiko restore identitas lama lewat restore_guest_identity).
 */
export async function clearDeviceId(): Promise<void> {
  cached = null;
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
  } catch (err) {
    loggerWarn("Gagal menghapus device ID dari storage", err);
  }
}
