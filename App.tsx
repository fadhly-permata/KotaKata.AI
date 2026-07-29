import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ThemeProvider } from "./src/presentation/components/providers/ThemeProvider";
import ErrorBoundary from "./src/presentation/components/common/ErrorBoundary";
import RootNavigator from "./src/presentation/navigation/RootNavigator";
import { loggerInfo } from "./src/utils/logger";
import { View, ActivityIndicator, StyleSheet } from "react-native";

loggerInfo("App mounted");

export default function App() {
  const [fontsLoaded] = useFonts({
    FontAwesome: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf"),
    FontAwesome5_Brands: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf"),
    FontAwesome5_Regular: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf"),
    FontAwesome5_Solid: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#e040a0" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fef7ff",
  },
});
