import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import API from "../services/api";
import SafeImage from "../components/SafeImage";

export default function CommentScreen({ route }) {
  const { postId } = route.params;

  const navigation = useNavigation();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");



  const loadComments = useCallback(async () => {
    try {
      const res = await API.get("/posts/feed");
      const post = res.data.find((p) => p._id === postId);
      setComments(post?.comments || []);
    } catch (err) {
      console.log("Load comments error", err);
    }
  }, [postId]);

  /* ================= LOAD COMMENTS ================= */
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  /* ================= ADD COMMENT ================= */
  const addComment = async () => {
    if (!text.trim()) return;

    try {
      const res = await API.post(`/posts/${postId}/comment`, { text });
      setComments(res.data);
      setText("");

      // 🔥 NEW: tell HomeScreen to refresh
      navigation.setParams({ refreshFeed: true });
    } catch (err) {
      console.log("Add comment error", err);
    }
  };

  /* ================= 🔥 DELETE COMMENT (NEW) ================= */
  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/posts/${postId}/comment/${commentId}`);

              // update UI without reloading
              setComments((prev) => prev.filter((c) => c._id !== commentId));

              // 🔥 NEW: tell HomeScreen to refresh
              navigation.setParams({ refreshFeed: true });
            } catch (err) {
              console.log("Delete comment error", err);
            }
          },
        },
      ]
    );
  };

  /* ================= COMMENT UI ================= */
  
const renderComment = ({ item }) => {

  const avatarUri =
    typeof item.user?.profileImage === "string"
      ? item.user.profileImage
      : item.user?.profileImage?.url ||
        "https://i.pravatar.cc/150";

  return (
    <View style={styles.commentRow}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Profile", {
            userId: item.user?._id,
          })
        }
      >
        <SafeImage uri={avatarUri} style={styles.avatar} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={styles.username}>
          {item.user?.name || "User"}
        </Text>

        <Text style={styles.commentText}>
          {item.text}
        </Text>
      </View>

      <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
        <Ionicons name="trash-outline" size={18} color="red" />
      </TouchableOpacity>
    </View>
  );
};


return (
  <SafeAreaView style={styles.container}>
    {/* 🔹 HEADER */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Comments</Text>
      <View style={{ width: 24 }} /> 
    </View>

    {/* 🔹 COMMENTS LIST */}
    <FlatList
      data={comments}
      keyExtractor={(item) => item._id}
      renderItem={renderComment}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    />

    {/* 🔹 INPUT BAR */}
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Add a comment..."
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <TouchableOpacity onPress={addComment}>
          <Ionicons name="send" size={22} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
);


}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  header: {
  height: 50,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  borderBottomWidth: 0.5,
  borderColor: "#ddd",
  backgroundColor: "#fff",
},

headerTitle: {
  flex: 1,
  textAlign: "center",
  fontSize: 16,
  fontWeight: "600",
},
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  commentRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
    alignItems: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },

  username: {
    fontWeight: "bold",
    marginBottom: 2,
  },

  commentText: {
    color: "#333",
  },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 0.5,
    alignItems: "center",
  },

  input: {
    flex: 1,
    marginRight: 10,
  },
});
