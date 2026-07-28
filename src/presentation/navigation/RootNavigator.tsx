import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../components/providers/ThemeProvider";
import AuthScreen from "../../features/auth/AuthScreen";
import MainMenuScreen from "../../features/game/MainMenuScreen";
import GameScreen from "../../features/game/GameScreen";
import HistoryScreen from "../../features/history/HistoryScreen";
import ProfileScreen from "../../features/profile/ProfileScreen";
import SettingsScreen from "../../features/settings/SettingsScreen";

export type RootStackParamList = {
  Auth: undefined;
  MainMenu: undefined;
  Game: undefined;
  History: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { theme } = useTheme();

  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="MainMenu"
        screenOptions={{
          animation: "slide_from_right",
          animationDuration: 300,
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: "700", fontSize: 16 },
          orientation: "portrait",
        }}
      >
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false, animation: "fade", animationDuration: 350 }}
        />
        <Stack.Screen
          name="MainMenu"
          component={MainMenuScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            animation: "fade",
            animationDuration: 250,
            gestureEnabled: false,
            title: "KotaKata",
          }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "Sejarah Saya" }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: "Profil" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Pengaturan" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
