import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import API from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function FollowListScreen({ route, navigation }) {
  const { userId, type } = route.params; // followers | following
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    try {
      const res = await API.get(`/users/${userId}/${type}`);
      setUsers(res.data || []);
    } catch (err) {
      console.log("Follow list error:", err.message);
    }
  };

  /* FOLLOW / UNFOLLOW */
  const toggleFollow = async (targetUserId) => {
    try {
      await API.post(`/users/${targetUserId}/follow`);

      // 🔥 INSTANT UI UPDATE (Instagram feel)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );
    } catch (err) {
      console.log("Follow error:", err.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      {/* PROFILE CLICK */}
      <TouchableOpacity
        style={styles.userInfo}
       onPress={async () => {
  const storedUser = await AsyncStorage.getItem("user");
  const currentUserId = storedUser ? JSON.parse(storedUser)._id : null;

  if (item._id === currentUserId) {
    // ✅ OWN PROFILE → NO userId
    navigation.navigate("Main", {
      screen: "Profile",
    });
  } else {
    // ✅ OTHER USER
    navigation.navigate("Main", {
      screen: "Profile",
      params: { userId: item._id },
    });
  }
}}

      >
        <Image
          source={{
            uri: item.profileImage
              ? item.profileImage
              : "https://i.pravatar.cc/150",
          }}   
          style={styles.avatar}
        />
        <Text style={styles.name}>{item.name}</Text>
      </TouchableOpacity>

      {/* FOLLOW BUTTON */}
      <TouchableOpacity
        style={[styles.btn, item.isFollowing && styles.unfollowBtn]}
        onPress={() => toggleFollow(item._id)}
      >
        <Text style={styles.btnText}>
          {item.isFollowing ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {type === "followers" ? "Followers" : "Following"}
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
      />
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
  },

  btn: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },

  unfollowBtn: {
    backgroundColor: "#aaa",
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});
