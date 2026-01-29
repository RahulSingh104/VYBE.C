import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import API from "../services/api";

import { SafeAreaView } from "react-native-safe-area-context";


export default function SearchScreen() {
  const navigation = useNavigation();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 🔍 SEARCH USERS */
  const searchUsers = async (text) => {
    setQuery(text);

    if (!text.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const res = await API.get(`/search?q=${text}`);
      setUsers(res.data || []);
    } catch (err) {
      console.log("Search error:", err.message);
    } finally {
      setLoading(false);
    }
  };


  /* 👤 RENDER USER */
  const renderUser = ({ item }) => {
    const avatarUri =
  typeof item.profileImage === "string"
    ? item.profileImage
    : item.profileImage?.url ||
      "https://i.pravatar.cc/150";
      return (

    <TouchableOpacity
      style={styles.userRow}
      onPress={() =>
        navigation.navigate("Profile", { userId: item._id })
      }
    >

      
      <Image
  source={{ uri: avatarUri }}
  style={styles.avatar}
/>

      
      
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
    
  )};

  return (
    <SafeAreaView style={styles.safe}>
    <View style={styles.container}>
      {/* SEARCH INPUT */}
      <TextInput
        placeholder="Search users..."
        value={query}
        onChangeText={searchUsers}
        style={styles.input}
      />

      {/* LOADING */}
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      {/* RESULTS */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && query ? (
            <Text style={styles.empty}>No users found</Text>
          ) : null
        }
      />
    </View>
    </SafeAreaView>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    paddingHorizontal: 12,
    paddingTop: 10, // 🔥 keeps input below status bar
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },

  name: {
    fontSize: 15,
    fontWeight: "500",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});

