import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  SafeAreaView,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";

import CommentScreen from "./CommentScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket } from "../services/socket";
import SafeImage from "@/components/SafeImage";
import { log, error } from "../services/logger";


const socket = getSocket();

export default function PostView({ route, navigation }) {
  const { postId } = route.params;
  const lastTap = useRef(null);

  const [post, setPost] = useState(null);
  const [showComments, setShowComments] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const [likeLoading, setLikeLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        setCurrentUserId(JSON.parse(user).id);
      }
    })();
  }, []);

  /* ================= LOAD POST ================= */
  useEffect(() => {
    loadPost();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadPost = async () => {
    try {
      const res = await API.get(`/posts/${postId}`);
      setPost(res.data);
    } catch (err) {
      error("Post load error", err.message);
    }
  };

  useEffect(() => {
    socket.on("post:like:update", ({ postId, likes }) => {
      setPost((prev) =>
        prev && prev._id === postId ? { ...prev, likes } : prev,
      );
    });

    return () => {
      socket.off("post:like:update");
    };
  }, []);

  /* ================= LIKE (SAFE + SYNCED) ================= */
  const handleLike = async () => {
    if (!post || likeLoading || !currentUserId) return;

    setLikeLoading(true);

    // 🔥 DERIVED SOURCE OF TRUTH (NO BREAKING CHANGE)
    const prevLikes = post.likes || [];
    const wasLiked = prevLikes.includes(currentUserId);

    // 🔥 1. OPTIMISTIC UI (FIXED)
    setPost((prev) => ({
      ...prev,
      isLiked: !wasLiked, // 🔁 UI purpose only (kept)
      likes: wasLiked
        ? prev.likes.filter((id) => id !== currentUserId)
        : [...prev.likes, currentUserId],
    }));

    try {
      // 🔥 2. API CALL (UNCHANGED)
      await API.post(`/posts/${post._id}/like`);
    } catch (err) {
      // ❌ 3. ROLLBACK (SAFE)
      setPost((prev) => ({
        ...prev,
        isLiked: wasLiked,
        likes: prevLikes,
      }));

      error("Like error", err.response?.data || err.message);
    } finally {
      setLikeLoading(false);
    }
  };

  const isLiked =
    post &&
    currentUserId &&
    Array.isArray(post.likes) &&
    post.likes.includes(currentUserId);

  if (!post) return null;

  // const isOwner = post?.user?._id?.toString() === currentUserId?.toString();

  const isOwner = post?.createdBy?.toString() === currentUserId?.toString();

  // ✅ SAFE IMAGE NORMALIZATION (FUTURE PROOF)
  const imageUri =
    typeof post?.image === "string" ? post.image : post?.image?.url || null;

  // ✅ SAFE AVATAR NORMALIZATION
  const avatarUri =
    typeof post?.user?.profileImage === "string"
      ? post.user.profileImage
      : post?.user?.profileImage?.url || "https://i.pravatar.cc/150";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {post.isAnonymous && (
              <Ionicons name="eye-off-outline" size={16} color="#555" />
            )}
            {isOwner && (
              <TouchableOpacity
                onPress={() => setShowDelete(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={22} />
              </TouchableOpacity>
            )}

            {post.isDiscussion && (
              <Ionicons name="chatbubble-outline" size={16} color="#555" />
            )}
          </View>
        </View>

        {/* ================= CONTENT ================= */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 🔹 USER ROW */}
          <View style={styles.userRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", {
                  userId: post.user?._id,
                })
              }
            >
             <SafeImage
  uri={avatarUri}
  style={styles.avatar}
/>

            </TouchableOpacity>

            <Text style={styles.username}>
              {post.isAnonymous ? "Anonymous" : post.user?.name}
            </Text>
          </View>

          {/* 🔹 DISCUSSION BOX */}

          {post.isDiscussion && !post.image && (
            <View style={styles.discussionBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={28}
                color="#555"
              />
              <Text style={styles.discussionText}>{post.caption}</Text>
            </View>
          )}

          {/* 🔹 IMAGE (DOUBLE TAP LIKE) */}
          {/* {post.image?.url && (
            <Pressable
              onPress={() => {
                const now = Date.now();
                if (lastTap.current && now - lastTap.current < 300) {
                  handleLike(); // ❤️ DOUBLE TAP
                }
                lastTap.current = now;
              }}
            >
              <Image
                source={{ uri: post.image.url }}
                style={styles.image}
              />
            </Pressable>
          )} */}

          {imageUri && (
            <Pressable
              onPress={() => {
                const now = Date.now();
                if (lastTap.current && now - lastTap.current < 300) {
                  handleLike();
                }
                lastTap.current = now;
              }}
            >
              <SafeImage uri={imageUri} style={styles.image} />
            </Pressable>
          )}

          {/* 🔹 ACTION BAR */}
          <View style={styles.actionRow}>
            {/* 🔖 UNSAVE (only if coming from Saved) */}
            {route.params?.fromSaved && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await API.post(`/posts/${post._id}/save`);

                    // // 🔥 LIVE UNSAVE SYNC
                    // socket.emit("post:unsave", { postId: post._id });

                    navigation.goBack(); // 🔙 back to SavedScreen
                  } catch (err) {
                    console.log(
                      "Unsave error",
                      err.response?.data || err.message,
                    );
                    Alert.alert("Unsave failed");
                  }
                }}
              >
                <Ionicons name="bookmark" size={26} color="black" />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleLike}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "red" : "#000"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowComments(true)}>
              <Ionicons name="chatbubble-outline" size={26} />
            </TouchableOpacity>
          </View>

          {/* 🔹 COUNTS */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {post.likes?.length || 0} likes
            </Text>
            <Text style={styles.countText}>
              {post.comments?.length || 0} comments
            </Text>
          </View>

          {/* 🔹 CAPTION / DISCUSSION */}
          {post.caption && <Text style={styles.caption}>{post.caption}</Text>}
        </ScrollView>

        {/* ================= COMMENTS BOTTOM SHEET ================= */}
        <Modal
          visible={showComments}
          animationType="slide"
          transparent
          onRequestClose={() => setShowComments(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowComments(false)}
              >
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
              {/* ✅ REAL COMMENT LIST (BOTTOM SHEET) */}
              <CommentScreen
                route={{ params: { postId: post._id } }}
                navigation={navigation}
              />
            </View>
          </View>
        </Modal>
        {/* ================= DELETE POST MODAL ================= */}
        <Modal
          transparent
          visible={showDelete}
          animationType="fade"
          onRequestClose={() => setShowDelete(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 14,
                width: "80%",
              }}
            >
              <Text style={{ fontSize: 16, marginBottom: 16 }}>
                Delete this post?
              </Text>

              <TouchableOpacity
                style={{ marginBottom: 12 }}
                onPress={async () => {
                  try {
                    await API.delete(`/posts/${post._id}`);

                    // 🔥 SOCKET EMIT (LIVE SYNC)
                    socket.emit("post:delete", { postId: post._id });

                    setShowDelete(false);
                    navigation.goBack(); // back to feed/profile
                  } catch (err) {
                    console.log(
                      "Delete post error",
                      err.response?.data || err.message,
                    );
                    Alert.alert("Delete failed");
                  }
                }}
              >
                <Text style={{ color: "red", fontWeight: "600" }}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowDelete(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14, // 🔥 more tap space
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  headerRight: {
    flexDirection: "row",
    gap: 8,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  username: {
    fontWeight: "600",
    fontSize: 14,
  },

  image: {
    width: "100%",
    height: 380,
    resizeMode: "cover",
    backgroundColor: "#000",
  },

  actionRow: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  countRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 12,
  },

  countText: {
    fontWeight: "600",
    fontSize: 13,
  },

  caption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#222",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalSheet: {
    height: "75%", // 🔥 IMPORTANT
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },

  closeBtn: {
    alignSelf: "flex-end",
    padding: 12,
  },
  discussionBox: {
    margin: 16,
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
  },

  discussionText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});
