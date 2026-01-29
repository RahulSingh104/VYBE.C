import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
  Animated,
  Modal,
} from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Menu, Divider, Portal } from "react-native-paper";
import CommentScreen from "./CommentScreen";
import { getSocket } from "../services/socket";
import SafeImage from "@/components/SafeImage";
import { log, error } from "../services/logger";


/* ---------------- COLORS ---------------- */
const COLORS = {
  bg: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
};

const getAnonLabel = (score = 0) => {
  if (score > 10) return "🌕 Trusted Voice";
  if (score > 3) return "🌘 Growing Voice";
  return "🌑 New Voice";
};

const socket = getSocket();

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  /* MENU STATE */
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const navigation = useNavigation();
  const route = useRoute();

  // 🔥 STEP 5.1 — TEMPORARY LOCAL POST INJECTION
  useEffect(() => {
    if (route.params?.newPost) {
      setPosts((prev) => [route.params.newPost, ...prev]);

      // 🧹 clear param to avoid duplicate insert
      navigation.setParams({ newPost: null });
    }
  }, [route.params?.newPost, navigation]);

  /* 🔥 DOUBLE TAP TRACKERS (FIXED) */
  const lastTapTime = useRef(0);
  const lastTappedPostId = useRef(null);

  /* ❤️ HEART ANIMATION REFS */
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const [refreshing, setRefreshing] = useState(false);

  const crownScale = useRef(new Animated.Value(1)).current;
  const crownGlow = useRef(new Animated.Value(0.4)).current;
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState(null);

  /* -------- LOAD CURRENT USER -------- */
  useEffect(() => {
    (async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          setCurrentUserId(JSON.parse(userData).id);
        }
      } catch (err) {
        error("User load error:", err);
      }
    })();
  }, []);

  /* 👑 CROWN ANIMATION LOOP (SAFE) */
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(crownScale, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(crownScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(crownGlow, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(crownGlow, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- LOAD FEED -------- */
  const loadFeed = useCallback(async () => {
    try {
      setRefreshing(true);

      // 🔥 STEP 1: LOAD CACHE FIRST
      const cached = await AsyncStorage.getItem("feed_cache");
      if (cached) {
        setPosts(JSON.parse(cached));
      }

      // 🔥 STEP 2: FETCH FROM API
      const res = await API.get("/posts/feed");
      setPosts(res.data || []);

      // 🔥 STEP 3: SAVE CACHE
      await AsyncStorage.setItem("feed_cache", JSON.stringify(res.data || []));

      log("✅ Feed response:", res.data);
      setPosts(res.data || []);

      log("📡 Fetching feed...");
    } catch (err) {
      error("❌ FEED ERROR FULL:", err);
      error("❌ FEED ERROR RESPONSE:", err.response?.data);
      Alert.alert("Feed error", JSON.stringify(err.response?.data));
      if (err.response?.status === 403) {
        setPosts([]);
      } else {
        Alert.alert("Error", "Failed to load posts");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (route.params?.refreshFeed) {
      loadFeed();
      navigation.setParams({ refreshFeed: false });
    }
  }, [route.params?.refreshFeed, loadFeed, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed]),
  );

  useEffect(() => {
    socket.on("post:like:update", ({ postId, likes }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes } : p)),
      );
    });

    return () => {
      socket.off("post:like:update");
    };
  }, []);

  useEffect(() => {
    socket.on("post:delete:update", ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });

    return () => {
      socket.off("post:delete:update");
    };
  }, []);

  /* -------- DELETE POST -------- */
  const deletePost = async (postId) => {
    try {
      await API.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch {
      Alert.alert("Error", "Delete failed");
    }
  };
  /* -------- TOGGLE LIKE (OPTIMISTIC UI) -------- */
  const toggleLike = async (postId) => {
    let previousPosts;

    // 🔥 1. OPTIMISTIC UI
    setPosts((prev) => {
      previousPosts = prev;

      return prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              likes: p.likes?.includes(currentUserId)
                ? p.likes.filter((id) => id !== currentUserId)
                : [...(p.likes || []), currentUserId],
            }
          : p,
      );
    });

    try {
      // 🔥 2. API CALL
      await API.post(`/posts/${postId}/like`);
    } catch (err) {
      error("❌ LIKE ERROR:", err);
      // ❌ 3. ROLLBACK
      setPosts(previousPosts);
      Alert.alert("Like failed");
    }
  };

  /* ❤️ PLAY HEART ANIMATION */
  const playHeartAnimation = () => {
    heartScale.setValue(0.5);
    heartOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* -------- DOUBLE TAP HANDLER (SAFE) -------- */
  const handleDoubleTap = (postId, isLiked) => {
    const now = Date.now();

    if (
      lastTappedPostId.current === postId &&
      now - lastTapTime.current < 300
    ) {
      playHeartAnimation(); // ❤️ animation

      if (!isLiked) {
        toggleLike(postId);
      }
    }

    lastTapTime.current = now;
    lastTappedPostId.current = postId;
  };

  /* -------- TOGGLE SAVE -------- */
  const toggleSave = async (postId) => {
    try {
      await API.post(`/posts/${postId}/save`);
      Alert.alert("Saved updated");
    } catch (err) {
      Alert.alert(err.response?.data?.message || "Save failed");
    }
  };

  /* -------- FOLLOW UI SYNC (GLOBAL) -------- */
  const toggleFollowUI = (targetUserId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.user?._id?.toString() === targetUserId?.toString()) {
          return {
            ...post,
            user: {
              ...post.user,
              isFollowing: !post.user.isFollowing,
            },
          };
        }
        return post;
      }),
    );
  };

  /* -------- OPEN COMMENTS -------- */
  const openComments = (postId) => {
    setActivePostId(postId);
    setShowComments(true);
  };

  /* -------- MENU HANDLERS -------- */
  const openMenu = (event, postId) => {
    setMenuAnchor({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
    setSelectedPostId(postId);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedPostId(null);
  };

  /* -------- TOP SCORE (SAFE) -------- */
  const topScore =
    posts.length > 0 ? Math.max(...posts.map((p) => p.score || 0)) : 0;

  /* -------- RENDER POST -------- */
  const renderPost = ({ item }) => {
    if (!item || !item._id) return null;
    const likes = Array.isArray(item.likes) ? item.likes : [];
    const comments = Array.isArray(item.comments) ? item.comments : [];

    const isOwner = item.user?._id?.toString() === currentUserId?.toString();

    const imageUrl =
      typeof item.image === "string"
        ? item.image
        : item.image?.url ||
          (Array.isArray(item.images) ? item.images[0]?.url : null);

    const isLiked = likes.includes(currentUserId);

    const isDiscussion = item.isDiscussion === true;
    const hasImage = Boolean(item.image);

    return (
      <View style={styles.card}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.userInfo}
            disabled={!item.user?._id} // 🔥 disable for anonymous
            onPress={() => {
              if (!item.user?._id) return;
              navigation.push("Profile", {
                userId: item.user._id,
              });
            }}
          >
            {/* <Image
              source={{
                uri: item.user?.profileImage || "https://i.pravatar.cc/150",
              }}
              style={styles.avatar}
            /> */}

            <SafeImage uri={imageUrl} style={styles.avatar} />

            <Text style={styles.username}>{item.user?.name}</Text>
            {item.isAnonymous && (
              <Text style={{ fontSize: 12, color: "#777" }}>
                Anonymous • {getAnonLabel(item.user?.anonymousScore || 0)}
              </Text>
            )}
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity onPress={(e) => openMenu(e, item._id)}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
            </TouchableOpacity>
          )}

          {item.user?._id && !isOwner && !item.user.isFollowing && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  // 🔥 1. Optimistic UI (ALL posts of same user)
                  toggleFollowUI(item.user._id);

                  // 🔥 2. API call (unchanged backend)
                  await API.post(`/users/${item.user._id}/follow`);
                } catch {
                  Alert.alert("Follow failed");
                }
              }}
            >
              <Text style={{ color: "#2196F3", fontWeight: "600" }}>
                Follow
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {/* 👑 TOP POST BADGE (ANIMATED) */}
        {item.score === topScore && topScore > 0 && (
          <Animated.View
            style={{
              alignSelf: "flex-start",
              marginLeft: 12,
              marginBottom: 6,
              transform: [{ scale: crownScale }],
              opacity: crownGlow,
            }}
          >
            <Text style={{ color: "#FFD700", fontWeight: "700" }}>
              👑 Top Post Today
            </Text>
          </Animated.View>
        )}

        {/* 🔥 POST BODY RENDER LOGIC — FINAL */}
        {isDiscussion ? (
          /* 💬 DISCUSSION POST */
          <Pressable
            onPress={() =>
              navigation.navigate("PostView", {
                postId: item._id,
              })
            }
          >
            <View style={styles.discussionCard}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={28}
                color="#555"
              />
              <Text style={styles.discussionText}>{item.caption}</Text>
            </View>
          </Pressable>
        ) : hasImage ? (
          /* 📸 NORMAL IMAGE POST */
          <Pressable
            onPress={() =>
              navigation.navigate("PostView", {
                postId: item._id,
              })
            }
            onLongPress={() => handleDoubleTap(item._id, isLiked)}
          >
            <View>
              <SafeImage uri={imageUrl} style={styles.image} />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.heartOverlay,
                  {
                    opacity: heartOpacity,
                    transform: [{ scale: heartScale }],
                  },
                ]}
              >
                <Ionicons name="heart" size={100} color="white" />
              </Animated.View>
            </View>
          </Pressable>
        ) : (
          /* 📝 NORMAL TEXT POST */
          <View style={styles.normalTextPost}>
            <Text style={styles.normalText}>{item.caption}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <View style={styles.leftActions}>
            {/* ❤️ LIKE */}
            {!isDiscussion && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => toggleLike(item._id)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 🔥 bigger tap
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={isLiked ? "red" : "#000"}
                />

                {/* ✅ show count ONLY if > 0 */}
                {likes.length > 0 && (
                  <Text style={styles.actionCount}>{likes.length}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* 💬 COMMENT */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => openComments(item._id)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 🔥 bigger tap
            >
              <Ionicons name="chatbubble-outline" size={22} />

              {/* ✅ show count ONLY if > 0 */}
              {comments.length > 0 && (
                <Text style={styles.actionCount}>{comments.length}</Text>
              )}
            </TouchableOpacity>

            {/* 💬 DISCUSSION LABEL */}
            {isDiscussion && (
              <Text style={styles.discussionLabel}>💬 Discussion</Text>
            )}
          </View>

          {/* 🔖 SAVE */}
          {!item.isTemporary && (
            <TouchableOpacity
              onPress={() => toggleSave(item._id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 🔥 bigger tap
            >
              <Ionicons name="bookmark-outline" size={22} />
            </TouchableOpacity>
          )}
        </View>

        {/* LIKED BY TEXT */}
        {likes.length > 0 && (
          <Text style={styles.likedByText}>
            Liked by{" "}
            <Text style={styles.bold}>
              {isLiked ? "You" : item.user?.name || "Anonymous"}
            </Text>
            {likes.length > 1 && ` and ${likes.length - 1} others`}
          </Text>
        )}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              paddingHorizontal: 12,
            }}
          >
            {item.tags.map((t) => (
              <Text key={t} style={{ color: "#2196F3", marginRight: 6 }}>
                #{t}
              </Text>
            ))}
          </View>
        )}

        {/* CAPTION */}
        {item.caption && (
          <Text style={styles.caption}>
            <Text style={styles.username}>{item.user?.name} </Text>
            {item.caption}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topHeader}>
        {/* LEFT PLACEHOLDER (keeps center aligned) */}
        <View style={{ width: 28 }} />

        {/* APP NAME */}
        <Text style={styles.appName}>VYBE.C</Text>

        {/* RIGHT ICON */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ChatList")} // or any screen
        >
          <Ionicons name="chatbubble-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            You’ve consumed enough for today 🌿
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts.filter((p) => p && p._id)}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderPost}
          refreshing={refreshing}
          onRefresh={loadFeed}
        />
      )}

      <Portal>
        <Menu visible={menuVisible} onDismiss={closeMenu} anchor={menuAnchor}>
          <Menu.Item
            title="Delete"
            leadingIcon="delete"
            onPress={() => {
              closeMenu();
              deletePost(selectedPostId);
            }}
          />
          <Divider />
          <Menu.Item title="Cancel" onPress={closeMenu} />
        </Menu>
      </Portal>
      {/* ================= COMMENTS BOTTOM SHEET ================= */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* CLOSE BUTTON */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowComments(false)}
            >
              <Ionicons name="close" size={24} />
            </TouchableOpacity>

            {/* 🔥 REUSE SAME COMMENT SCREEN */}
            {activePostId && (
              <CommentScreen
                route={{ params: { postId: activePostId } }}
                navigation={navigation}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topHeader: {
    height: 50,
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
  },
  appName: { fontSize: 24, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: { fontWeight: "600", fontSize: 14 },
  image: {
    width: "100%",
    aspectRatio: 1,
    height: undefined,
    backgroundColor: "#eee",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  likedByText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.text,
  },
  bold: {
    fontWeight: "600",
  },
  caption: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  heartOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
    height: 24, // 🔥 FIXED HEIGHT (KEY)
  },

  actionCount: {
    marginLeft: 6,
    fontSize: 13,
    color: "#555",
    lineHeight: 16,
  },

  discussionLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
  },
  textPost: {
    height: 220,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  textPostContent: {
    fontSize: 16,
    color: "#111",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
  discussionCard: {
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  discussionText: {
    marginTop: 10,
    fontSize: 15,
    color: "#111",
    textAlign: "center",
    lineHeight: 22,
  },

  normalTextPost: {
    marginHorizontal: 12,
    paddingVertical: 18,
  },

  normalText: {
    fontSize: 15,
    color: "#111",
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalSheet: {
    height: "75%", // 🔥 Instagram style
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },

  closeBtn: {
    alignSelf: "flex-end",
    padding: 12,
  },
});
