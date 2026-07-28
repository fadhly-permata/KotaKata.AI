import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainMenuScreen from "../../features/game/MainMenuScreen";
import GameScreen from "../../features/game/GameScreen";
import HistoryScreen from "../../features/history/HistoryScreen";
import AuthScreen from "../../features/auth/AuthScreen";
import ProfileScreen from "../../features/profile/ProfileScreen";
import SettingsScreen from "../../features/settings/SettingsScreen";

export type RootStackParamList = {
  MainMenu: undefined;
  Game: undefined;
  History: undefined;
  Auth: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainMenu"
      screenOptions={{
        animation: "slide_from_right",
        animationDuration: 300,
      }}
    >
      <Stack.Screen
        name="MainMenu"
        component={MainMenuScreen}
        options={{ title: "KotaKata.AI" }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ title: "Papan Permainan" }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "Sejarah Saya" }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ title: "Masuk" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profil Saya" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Pengaturan" }}
      />
    </Stack.Navigator>
  );
}
