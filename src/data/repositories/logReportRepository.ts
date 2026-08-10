import { supabase } from "../sources/supabase";
import { Platform } from "react-native";
import { getOrCreateDeviceId } from "../../utils/deviceIdentity";
import type { LogEntry } from "../../utils/logDb";

/** Versi app dari package.json — dibundel konstan agar tidak perlu import JSON. */
const APP_VERSION = "1.0.0";

/** Batas entri per kiriman (hindari payload terlalu besar). */
const MAX_ENTRIES_PER_REPORT = 50;

export interface LogReportEntry {
  level: LogEntry["level"];
  source: string;
  message: string;
  details?: string;
  stack?: string;
  createdAt: number;
}

/**
 * Kirim laporan log (hanya level error/warning) ke Supabase untuk debugging.
 * Payload menyimpan salinan lengkap entri (termasuk stacktrace & inner
 * exception) — detail tersebut tidak pernah ditampilkan di UI aplikasi.
 *
 * RLS user_log_reports membatasi insert ke baris milik user sendiri
 * (auth.uid()::text = user_id), jadi aman dipanggil dari klien.
 */
export const logReportRepository = {
  async send(userId: string, entries: LogEntry[]): Promise<number> {
    const reportable = entries
      .filter((e) => e.level === "error" || e.level === "warn")
      .slice(0, MAX_ENTRIES_PER_REPORT);
    if (reportable.length === 0) return 0;

    const deviceId = await getOrCreateDeviceId().catch(() => undefined);
    const payload: LogReportEntry[] = reportable.map((e) => ({
      level: e.level,
      source: e.source,
      message: e.message,
      details: e.details,
      stack: e.stack,
      createdAt: e.createdAt,
    }));

    const { error } = await supabase.from("user_log_reports").insert({
      user_id: userId,
      level: reportable.some((e) => e.level === "error") ? "error" : "warn",
      payload,
      device_id: deviceId ?? null,
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
    if (error) {
      throw new Error(`Gagal kirim log ke Supabase: ${error.message}`);
    }
    return reportable.length;
  },
};
