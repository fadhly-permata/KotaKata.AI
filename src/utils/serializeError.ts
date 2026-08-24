/**
 * Serialisasi nilai thrown apa pun menjadi `Error` yang TERBACA di log DB.
 *
 * Latar belakang (triase log 24 Aug 2026): error non-`Error` — mis.
 * PostgrestError dari Supabase yang berupa plain object — kalau diserialisasi
 * dengan `String(err)` menjadi "[object Object]", sehingga penyebab error
 * hilang dan mustahil ditriase. Gunakan fungsi ini di setiap catch yang
 * meneruskan error ke logger.
 */
export function toError(err: unknown): Error {
  if (err instanceof Error && err.message) return err;
  const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown } | null;
  // PostgrestError: { message, code, details, hint }
  if (typeof e?.message === "string" && e.message) {
    const out = new Error(e.message);
    const extra = [
      e.code ? `code=${String(e.code)}` : "",
      e.details ? `details=${String(e.details)}` : "",
      e.hint ? `hint=${String(e.hint)}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    if (extra) out.message = `${e.message} (${extra})`;
    return out;
  }
  if (typeof err === "string" && err) return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    // JSON.stringify gagal (referensi melingkar dsb.) — fallback terakhir.
    return new Error(String(err));
  }
}
