import { Component, ErrorInfo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { loggerError } from "../../../utils/logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    loggerError("ErrorBoundary caught an error", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes("network") ||
        this.state.error?.message?.toLowerCase().includes("fetch");
      const isAuthError = this.state.error?.message?.toLowerCase().includes("auth") ||
        this.state.error?.message?.toLowerCase().includes("session");

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>
            {isNetworkError ? "📡" : isAuthError ? "🔐" : "⚠️"}
          </Text>
          <Text style={styles.title}>Terjadi Kesalahan</Text>
          <Text style={styles.subtitle}>
            {isNetworkError
              ? "Koneksi internet terputus. Data aman tersimpan di perangkat."
              : isAuthError
                ? "Sesi login bermasalah. Silakan login ulang."
                : "Aplikasi mengalami kendala teknis."}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug}>{this.state.error.message}</Text>
          )}
          <TouchableOpacity style={styles.button} activeOpacity={0.7} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  debug: { fontSize: 11, color: "#999", textAlign: "center", marginBottom: 16, fontFamily: "monospace" },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#5B4FB4",
  },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
