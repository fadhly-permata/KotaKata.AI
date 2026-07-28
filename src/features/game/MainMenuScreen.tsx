import { View, Text, StyleSheet } from "react-native";

export default function MainMenuScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>KotaKata.AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
});
