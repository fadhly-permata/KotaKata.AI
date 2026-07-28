import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../components/providers/ThemeProvider";
import MainMenuScreen from "../../features/game/MainMenuScreen";
import GameScreen from "../../features/game/GameScreen";
import HistoryScreen from "../../features/history/HistoryScreen";
import ProfileScreen from "../../features/profile/ProfileScreen";
import SettingsScreen from "../../features/settings/SettingsScreen";

export type RootStackParamList = {
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
          headerShown: false,
          orientation: "portrait",
        }}
      >
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            animation: "fade",
            animationDuration: 250,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
