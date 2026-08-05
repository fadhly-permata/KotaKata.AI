/**
 * Helper untuk membaca identitas pemain dari `user_metadata` session Supabase.
 * Provider berbeda menaruh data di key yang berbeda:
 * - Google: `full_name` / `name`, foto di `avatar_url` / `picture`
 * - Email: `display_name`
 */

/** Nama tampilan dari metadata (full_name → name → display_name). */
export function displayNameFromMetadata(
  metadata: Record<string, any> | undefined,
): string | undefined {
  const raw = metadata?.full_name ?? metadata?.name ?? metadata?.display_name ?? undefined;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw.trim();
}

/** URL foto profil dari metadata (avatar_url → picture). */
export function avatarUrlFromMetadata(
  metadata: Record<string, any> | undefined,
): string | undefined {
  const raw = metadata?.avatar_url ?? metadata?.picture ?? undefined;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}
