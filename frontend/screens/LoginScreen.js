import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import API from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ENV from "../services/config";

const COLORS = {
  primary: "#4CAF50",
  secondary: "#2196F3",
  background: "#F5F5F5",
  text: "#333333",
  border: "#CCCCCC",
  white: "#FFFFFF",
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- LOGIN FUNCTION ---------------- */
  const login = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }

    try {
      setLoading(true);

      // 🔍 Debug (optional, safe)
      console.log("LOGIN API URL 👉", ENV.apiUrl);

      const res = await API.post("/auth/login", {
        email,
        password,
      });

      /* ✅ SAVE TOKEN */
      await AsyncStorage.setItem("token", res.data.token);

      /* ✅ SAVE FULL USER OBJECT (VERY IMPORTANT) */
      await AsyncStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      console.log("LOGIN USER SAVED 👉", res.data.user);

      /* ✅ GO TO MAIN APP */
      navigation.replace("Main");

    } catch (err) {
      console.log("LOGIN ERROR 👉", err.response?.data || err.message);
      Alert.alert("Login Failed", "Invalid email or password");
    } finally {
      setLoading(false);
    }
    
  };
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* LOGO */}
        <Text style={styles.logo}>VYBE.C</Text>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue</Text>
        </View>

        {/* EMAIL */}
        <TextInput
          placeholder="Email"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />

        {/* PASSWORD */}
        <TextInput
          placeholder="Password"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={login}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginButtonText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        {/* REGISTER LINK */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerLinkText}>
            Don’t have an account? Register
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
  },
  logo: {
    fontSize: 42,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text,
  },
  input: {
    height: 50,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  registerLinkText: {
    color: COLORS.secondary,
    marginTop: 25,
    textAlign: "center",
  },
});
