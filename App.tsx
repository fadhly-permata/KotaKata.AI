import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "./src/presentation/components/providers/ThemeProvider";
import ErrorBoundary from "./src/presentation/components/common/ErrorBoundary";
import RootNavigator from "./src/presentation/navigation/RootNavigator";
import { loggerInfo } from "./src/utils/logger";

loggerInfo("App mounted");

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
