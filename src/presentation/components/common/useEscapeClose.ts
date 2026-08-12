import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * Tutup dengan tombol ESC (web/desktop). Aman lintas platform: hanya aktif
 * saat `active` true DAN di web (native tidak punya window keydown, jadi
 * tidak ada listener terpasang di Android/iOS). Memakai ref supaya callback
 * `onEscape` yang terbaru dipakai tanpa perlu re-subscribe tiap render.
 */
export function useEscapeClose(active: boolean, onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active || Platform.OS !== "web" || typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);
}
