import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/presentation/components/providers/ThemeProvider";
import ErrorBoundary from "./src/presentation/components/common/ErrorBoundary";
import RootNavigator from "./src/presentation/navigation/RootNavigator";
import { loggerInfo } from "./src/utils/logger";
import { initLogDb, setupGlobalLogging } from "./src/utils/logDb";
import { initSound } from "./src/utils/sound";

// Database log SQLite lokal: inisialisasi sejak awal + tangkap error global
// supaya setiap issue otomatis tercatat (bisa dicek di halaman Pengaturan).
setupGlobalLogging();
void initLogDb();
// Efek suara: biarkan berbunyi di mode silent (iOS) + muat preferensi user.
initSound();

loggerInfo("App mounted");

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
