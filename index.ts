import { registerRootComponent } from "expo";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

// ---------------------------------------------------------------------------
// Boot error catcher (PLAN-076): kalau ada modul yang crash saat evaluasi
// (import chain App → RootNavigator → dst.), app sebelumnya mati jadi layar
// putih polos tanpa petunjuk apa pun. Dengan lazy require di dalam try-catch,
// error evaluasi modul mana pun ditampilkan LANGSUNG di layar supaya bisa
// dilaporkan & diperbaiki.
// ---------------------------------------------------------------------------
let AppComponent: React.ComponentType | null = null;
let bootError: unknown = null;
try {
  AppComponent = require("./App").default as React.ComponentType;
} catch (err) {
  bootError = err;
  // Biarkan tetap tercatat via ErrorUtils bila sempat, lalu tampilkan di bawah.
  // eslint-disable-next-line no-console
  console.error("[boot] Gagal memuat App:", err);
}

function formatBootError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\n\n${err.stack ?? ""}`;
  }
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1a1a2e" },
  content: { padding: 20, paddingTop: 60 },
  title: { color: "#ff8a8a", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  body: { color: "#e8e8f0", fontSize: 12, fontFamily: "monospace" },
});

function BootErrorScreen(): React.ReactElement {
  return React.createElement(
    ScrollView,
    { style: styles.root, contentContainerStyle: styles.content },
    React.createElement(Text, { style: styles.title }, "Gagal memuat aplikasi"),
    React.createElement(Text, { style: styles.body }, formatBootError(bootError)),
  );
}

if (AppComponent) {
  registerRootComponent(AppComponent);
} else {
  registerRootComponent(BootErrorScreen);
}
