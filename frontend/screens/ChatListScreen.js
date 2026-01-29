import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";
import SafeImage from "../components/SafeImage";

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const res = await API.get("/chat");
      setChats(res.data);
    } catch (err) {
      console.log("Chat list error:", err.message);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>Messages</Text>

        <Ionicons name="create-outline" size={26} />
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={18}
          color="#777"
          onPress={() => navigation.navigate("Search")}
        />
        <TextInput
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* CHAT LIST */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.user._id}
        renderItem={({ item }) => {
          const avatarUri =
            typeof item.user?.profileImage === "string"
              ? item.user.profileImage
              : item.user?.profileImage?.url || "https://i.pravatar.cc/150";

          return (
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() =>
                navigation.navigate("Chat", {
                  userId: item.user._id,
                })
              }
            >
              <SafeImage uri={avatarUri} style={styles.avatar} />

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user.name}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage || "Say hi 👋"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // ✅ white
    paddingHorizontal: 12,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
  },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  name: {
    fontWeight: "600",
    fontSize: 15,
  },

  lastMsg: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
});
