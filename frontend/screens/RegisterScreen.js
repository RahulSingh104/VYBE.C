import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../services/api";

const COLORS = {
  primary: "#4CAF50",
  secondary: "#2196F3",
  background: "#F5F5F5",
  text: "#333333",
  border: "#CCCCCC",
  white: "#FFFFFF",
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* ✅ NEW FIELDS */
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const register = async () => {
    if (!name || !email || !password || !college || !branch) {
      Alert.alert("Input Error", "Please fill in all fields.");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Input Error", "Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Input Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        name,
        email,
        password,
        college,
        branch,
      });

      Alert.alert("Success", "Account created successfully.", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Registration failed. Try again.";
      Alert.alert("Error", msg);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your journey</Text>
        </View>

        {/* INPUTS */}
        <TextInput
          placeholder="Full Name"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* ✅ NEW: COLLEGE */}
        <TextInput
          placeholder="College Name"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={college}
          onChangeText={setCollege}
        />

        {/* ✅ NEW: BRANCH */}
        <TextInput
          placeholder="Branch (e.g. CSE, IT, AIML, etc.)"
          placeholderTextColor={COLORS.border}
          style={styles.input}
          value={branch}
          onChangeText={setBranch}
        />

        {/* BUTTON */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={register}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.registerButtonText}>REGISTER</Text>
          )}
        </TouchableOpacity>

        {/* LOGIN LINK */}
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginLinkText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* STYLES */
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
    marginBottom: 12,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  loginLinkText: {
    color: COLORS.secondary,
    marginTop: 25,
    textAlign: "center",
  },
});
