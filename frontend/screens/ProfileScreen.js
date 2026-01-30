import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";
import { useRoute } from "@react-navigation/native";
import { getSocket } from "../services/socket";
import SafeImage from "../components/SafeImage";
import {  error } from "../services/logger";

const socket = getSocket();

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const route = useRoute();
  const profileUserId = route.params?.userId;

  /* =========================
     LOAD CURRENT USER (FIXED)
  ========================= */
  useEffect(() => {
    (async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setCurrentUserId(parsed._id || parsed.id);
      }
      setAuthReady(true);
    })();
  }, []);

  /* =========================
     LOAD PROFILE ON CHANGE
  ========================= */
  useEffect(() => {
    setUser(null);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);

    loadProfile(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId]);

  /* =========================
     SOCKET DELETE SYNC
  ========================= */
  useEffect(() => {
    socket.on("post:delete:update", ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });

    return () => socket.off("post:delete:update");
  }, []);

  /* =========================
     LOAD PROFILE API
  ========================= */
  const loadProfile = async (pageNumber = 1) => {
    try {
      if (pageNumber === 1) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      const endpoint = profileUserId
        ? `/users/${profileUserId}?page=${pageNumber}`
        : `/users/me?page=${pageNumber}`;

      const res = await API.get(endpoint);

      setUser(res.data.user);

      if (pageNumber === 1) {
        setPosts(res.data.posts || []);
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p._id));
          const fresh = (res.data.posts || []).filter((p) => !ids.has(p._id));
          return [...prev, ...fresh];
        });
      }

      setHasMore((res.data.posts || []).length > 0);
      setPage(pageNumber);
    } catch (err) {
      error("Profile error:", err.message);
    } finally {
      setRefreshing(false);
      setLoadingMore(false);
      setLoading(false);
    }
  };

  /* =========================
     FOLLOW / UNFOLLOW (SAFE)
  ========================= */
  const toggleFollow = async () => {
    try {
      setUser((prev) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followers: prev.isFollowing
          ? prev.followers.filter((id) => id !== currentUserId)
          : [...prev.followers, currentUserId],
      }));

      await API.post(`/users/${user._id}/follow`);
    } catch (err) {
      error("Follow error:", err.message);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  };

  /* =========================
     ✅ SINGLE SOURCE OF TRUTH
  ========================= */
  const isOwnProfile =
    authReady &&
    user?._id &&
    currentUserId &&
    String(user._id) === String(currentUserId);

  /* =========================
     LOADING
  ========================= */
  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Profile not available</Text>
      </View>
    );
  }

  const isFollowing = user.isFollowing;

  /* =========================
     RENDER (OLD UI 100%)
  ========================= */
  const avatarUri =
    typeof user.profileImage === "string"
      ? user.profileImage
      : user.profileImage?.url || "https://i.pravatar.cc/150";
  return (
    <View style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <View />
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.username}>{user.name}</Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} />
          </TouchableOpacity>
        )}
      </View>

      {/* PROFILE INFO */}
      <View style={styles.profileRow}>
        {/* <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
        /> */}

        <SafeImage uri={avatarUri} style={styles.avatar} />

        <View style={styles.stats}>
          <Stat label="Posts" value={posts.length} />
          <Stat
            label="Followers"
            value={user.followers?.length || 0}
            onPress={() =>
              navigation.navigate("FollowList", {
                userId: user._id,
                type: "followers",
              })
            }
          />
          <Stat
            label="Following"
            value={user.following?.length || 0}
            onPress={() =>
              navigation.navigate("FollowList", {
                userId: user._id,
                type: "following",
              })
            }
          />
        </View>
      </View>

      {/* EDUCATION */}
      {user.college && (
        <Text style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
          🎓 {user.college}
        </Text>
      )}
      {user.branch && (
        <Text style={{ fontSize: 13, color: "#555" }}>🧑‍💻 {user.branch}</Text>
      )}

      {/* BIO */}
      <Text style={styles.bio}>{user.bio || "Welcome to VYBE.C 🚀"}</Text>

      {/* OWN PROFILE */}
      {isOwnProfile && (
        <>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Text style={styles.editText}>EDIT PROFILE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editBtn, { marginTop: 8 }]}
            onPress={() => navigation.navigate("Saved")}
          >
            <Text style={styles.editText}>SAVED POSTS</Text>
          </TouchableOpacity>
        </>
      )}

      {/* OTHER PROFILE */}
      {!isOwnProfile && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.unfollowBtn]}
            onPress={toggleFollow}
          >
            <Text style={[styles.followText, isFollowing && { color: "#000" }]}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => navigation.navigate("Chat", { userId: user._id })}
          >
            <Text style={styles.messageText}>MESSAGE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* POSTS GRID */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id.toString()}
        numColumns={3}
        columnWrapperStyle={{ gap: 2 }} // 🔥 spacing between columns
        contentContainerStyle={{ gap: 2 }} // 🔥 spacing between rows
        refreshing={refreshing}
        onRefresh={() => loadProfile(1)}
        onEndReached={() => {
          if (hasMore && !refreshing) loadProfile(page + 1);
        }}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={false}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" /> : null
        }
        renderItem={({ item }) => {
          const imageUri =
            typeof item.image === "string"
              ? item.image
              : item.image?.url ||
                (Array.isArray(item.images) ? item.images[0]?.url : null);

          return (
            <TouchableOpacity
              key={item._id}
              activeOpacity={0.9}
              style={styles.gridItem}
              onPress={() => navigation.push("PostView", { postId: item._id })}
            >
              {imageUri ? (
                // <Image
                //   source={{ uri: imageUri }}
                //   style={styles.gridImage}
                //   resizeMode="cover"
                // />
                <SafeImage
                  uri={imageUri}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.gridImage, styles.textGrid]}>
                  {/* <Ionicons
                  name={
                    item.isDiscussion
                      ? "chatbubbles-outline"
                      : "document-text-outline"
                  }
                  size={26}
                  color="#555"
                /> */}

                  <Text
                    numberOfLines={5}
                    ellipsizeMode="tail"
                    style={styles.textPost}
                  >
                    {item.caption || item.text || "Post"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet</Text>}
      />
    </View>
  );
}

/* ---------- STAT ---------- */
const Stat = ({ label, value, onPress }) => (
  <TouchableOpacity onPress={onPress} disabled={!onPress}>
    <Text style={{ fontWeight: "bold", fontSize: 16 }}>{value}</Text>
    <Text style={{ color: "#666", fontSize: 13 }}>{label}</Text>
  </TouchableOpacity>
);

/* ---------- STYLES (UNCHANGED) ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  username: { fontSize: 22, fontWeight: "bold" },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 90, height: 90, borderRadius: 45, marginRight: 20 },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  bio: { marginTop: 10, fontSize: 14, color: "#333" },
  editBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  editText: { fontWeight: "600" },
  followBtn: {
    backgroundColor: "#0095F6",
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  unfollowBtn: { backgroundColor: "#EFEFEF" },
  followText: { color: "#fff", fontWeight: "600" },
  messageBtn: {
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#797171ff",
    backgroundColor: "#adb9bbff",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 8,
  },
  messageText: { fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  gridItem: {
    width: "33.33%",
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: "#eee",
  },
  gridImage: { width: "100%", height: "100%" },
  textGrid: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEE",
  },
  empty: { textAlign: "center", marginTop: 40, color: "#777" },
  textPost: {
    fontSize: 12,
    color: "#111",
    lineHeight: 16,
    fontWeight: "500",
  },
});
