// import {
//   FlatList,
//   Image,
//   StyleSheet,
//   Text,
// } from "react-native";
// import { useEffect, useState } from "react";
// import API from "../services/api";
// import ENV from "../services/config";

// export default function SavedScreen() {
//   const [posts, setPosts] = useState([]);

//   useEffect(() => {
//     loadSaved();
//   }, []);

//   const loadSaved = async () => {
//     const res = await API.get("/posts/saved/me");
//     setPosts(res.data);
//   };

//   return (
//     <FlatList
//       data={posts}
//       keyExtractor={item => item._id}
//       numColumns={3}
//       renderItem={({ item }) => (
//         <Image
//           source={{ uri: `${ENV.baseUrl}/uploads/${item.image || item.images?.[0]}` }}
//           style={styles.image}
//         />
//       )}
//       ListEmptyComponent={<Text style={{ textAlign: "center" }}>No saved posts</Text>}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   image: {
//     width: "33.33%",
//     height: 120,
//   },
// });

import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
// import ENV from "../services/config";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getSocket } from "../services/socket";
import SafeImage from "@/components/SafeImage";

const socket = getSocket();

export default function SavedScreen() {
  /* ---------------- STATE ---------------- */
  const [collections] = useState([
    { id: "all", name: "All" },
    { id: "college", name: "College" },
    { id: "tech", name: "Tech" },
  ]);
  const [activeCollection, setActiveCollection] = useState("all");

  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const navigation = useNavigation();

  /* ---------------- LOAD SAVED ---------------- */
  const loadSaved = useCallback(
    async (pageNumber = 1) => {
      if (!hasMore && pageNumber !== 1) return;

      if (pageNumber > 1) setLoadingMore(true);

      const res = await API.get(`/posts/saved/me?page=${pageNumber}`);

      if (pageNumber === 1) {
        setPosts(res.data || []);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));

          const newPosts = res.data.filter((p) => !existingIds.has(p._id));

          return [...prev, ...newPosts];
        });
      }

      setHasMore(res.data?.length > 0);
      setPage(pageNumber);
      setLoadingMore(false);
    },
    [hasMore],
  );

  const handleUnsave = async (postId) => {
    try {
      await API.post(`/posts/${postId}/save`); // toggle save
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      console.log("Unsave error:", err.message);
    }
  };

  useEffect(() => {
    loadSaved(1);
  }, [loadSaved]);

  /* ---------------- LIVE UNSAVE ---------------- */
  // useEffect(() => {
  //   socket.on("post:unsave:update", ({ postId }) => {
  //     setPosts((prev) => prev.filter((p) => p._id !== postId));
  //   });

  //   return () => socket.off("post:unsave:update");
  // }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };

    socket.on("post:unsave:update", handler);

    return () => {
      socket.off("post:unsave:update", handler);
    };
  }, []);

  /* ---------------- FILTERED DATA ---------------- */
  const filteredPosts = posts.filter((p) => {
    const matchSearch = p.caption?.toLowerCase().includes(search.toLowerCase());

    if (activeCollection === "all") return matchSearch;

    return matchSearch && p.tags?.includes(activeCollection);
  });

  /* ---------------- RENDER ---------------- */
  return (
    <View style={{ flex: 1 }}>
      {/* 🔍 SEARCH */}
      <TextInput
        placeholder="Search saved..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* 📁 COLLECTION TABS */}
      <View style={styles.collectionRow}>
        {collections.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setActiveCollection(c.id)}
            style={[
              styles.collectionTab,
              activeCollection === c.id && styles.collectionActive,
            ]}
          >
            <Text
              style={{
                color: activeCollection === c.id ? "#fff" : "#000",
              }}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🧱 GRID */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            loadSaved(page + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" style={{ margin: 10 }} />
          ) : null
        }
        renderItem={({ item }) => {
          const imageUri =
            typeof item.image === "string"
              ? item.image
              : item.image?.url ||
                (Array.isArray(item.images) ? item.images[0]?.url : null);

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.gridItem}
              onPress={() => handleUnsave(item._id)}
            >
              <SafeImage
                uri={imageUri || "https://via.placeholder.com/150"}
                style={styles.gridImage}
              />

              {/* 🔖 SAVED ICON */}
              <View style={styles.savedOverlay}>
                <Ionicons name="bookmark" size={16} color="#fff" />
              </View>

              {/* ✍️ NOTE INDICATOR */}
              {item.note && (
                <View style={styles.noteBadge}>
                  <Ionicons name="create-outline" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No saved posts</Text>}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  search: {
    margin: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
  },

  collectionRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 6,
  },

  collectionTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 8,
  },

  collectionActive: {
    backgroundColor: "#000",
  },

  gridItem: {
    width: "33.33%",
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: "#eee",
  },

  gridImage: {
    width: "100%",
    height: "100%",
  },

  savedOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 5,
    borderRadius: 12,
  },

  noteBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 4,
    borderRadius: 10,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});
