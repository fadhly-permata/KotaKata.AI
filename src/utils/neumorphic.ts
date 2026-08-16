import type { ViewStyle } from "react-native";
import type { NeumorphicShadowSpec } from "../presentation/themes/themeData";

export type NeumorphicState = "raised" | "pressed";

/**
 * Box-shadow neumorphic (PLAN-037) — gaya neumorphism.io: DUA bayangan,
 * terang di kiri-atas (offset negatif) + gelap di kanan-bawah (offset
 * positif). Dipakai elemen permukaan yang warnanya SAMA dengan latar agar
 * tampak "timbul".
 *
 * Memakai prop `boxShadow` (didukung RN 0.86 native + react-native-web —
 * keduanya menerima array objek), jadi lintas platform. `spec` kosong (tema
 * non-neumorphic tidak membawa `shadow`) → mengembalikan {} tanpa efek.
 *
 * State "pressed" memakai offset/blur kecil dengan arah bayangan DIBALIK
 * (inset) — efek elemen "tertekan" (mis. input), seperti neumorphism.io.
 */
export function neumorphicShadow(
  spec: NeumorphicShadowSpec | undefined,
  state: NeumorphicState = "raised",
): ViewStyle {
  if (!spec) return {};
  const offset = state === "pressed" ? (spec.insetOffset ?? 3) : (spec.offset ?? 9);
  const blur = state === "pressed" ? (spec.insetBlur ?? 6) : (spec.blur ?? 16);
  const inset = state === "pressed";
  return {
    boxShadow: [
      {
        offsetX: -offset,
        offsetY: -offset,
        blurRadius: blur,
        color: inset ? spec.dark : spec.light,
        inset,
      },
      {
        offsetX: offset,
        offsetY: offset,
        blurRadius: blur,
        color: inset ? spec.light : spec.dark,
        inset,
      },
    ],
    // Neutralkan prop shadow legacy (shadowColor/shadowOffset/elevation) supaya
    // tidak menumpuk dengan boxShadow di web/native (RNW mengubah shadow* jadi
    // boxShadow juga — kalau keduanya ada, hasilnya bisa dobel).
    shadowColor: undefined,
    shadowOffset: undefined,
    shadowOpacity: undefined,
    shadowRadius: undefined,
    elevation: undefined,
  };
}
