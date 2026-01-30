import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from "react-native";
import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {  error } from "../services/logger";
import { compressImage } from "../services/imageCompress";


/* TAG OPTIONS */
const TAGS = ["college", "tech", "memes", "placements", "confession"];
const MOODS = [
  { id: "happy", icon: "😊" },
  { id: "sad", icon: "😔" },
  { id: "angry", icon: "😡" },
  { id: "motivated", icon: "🔥" },
  { id: "stressed", icon: "🤯" },
];

export default function UploadScreen({ navigation }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null); // ✅ NEW
  const [isDiscussion, setIsDiscussion] = useState(false); // ✅ NEW
  const [isAnonymous, setIsAnonymous] = useState(false);
  /* MOODS */
  const [mood, setMood] = useState("happy");
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  

  /* RESET ON TAB CHANGE */
  useFocusEffect(
    useCallback(() => {
      return () => {
        setFile(null);
        setCaption("");
        setIsTemporary(false);
        setSelectedTag(null); // ✅ RESET TAG
        setIsDiscussion(false); // ✅ RESET
      };
    }, []),
  );

  /* PICK MEDIA */
  const pickMedia = async () => {
    if (isDiscussion) return; // 🔒 no media for discussion
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!res.canceled) {
      setFile(res.assets[0]);
    }
  };

  /* UPLOAD POST */
  const uploadPost = async () => {
    if (!caption && !file) {
      return Alert.alert("Write something or select media");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("isTemporary", isTemporary);
      formData.append("isDiscussion", isDiscussion); // ✅ NEW
      formData.append("tags", selectedTag); // ✅ SEND TAG
      formData.append("isAnonymous", isAnonymous);
      formData.append("mood", mood); // ✅ NEW

      if (file && !isDiscussion) {
        const compressedUri = await compressImage(file.uri);
        formData.append("image", {
          uri: compressedUri,
          type: file.mimeType || "image/jpeg",
          name: file.fileName || "upload.jpg",
        });
      }

      // await API.post("/posts/upload", formData, {
      //   headers: { "Content-Type": "multipart/form-data" },
      // });

      const res = await API.post("/posts/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});



const createdPost = res.data; // ✅ NOW res EXISTS

      

      Alert.alert("Success", "Post uploaded", [
        {
          text: "OK",
          onPress: async() => {
            await AsyncStorage.removeItem("feed_cache"); // 🧹 safe here

            setFile(null);
            setCaption("");
            setIsTemporary(false);
            setSelectedTag(null); // ✅ RESET TAG
            setIsDiscussion(false); // ✅ RESET DISCUSSION
            setIsAnonymous(false);
            setMood("happy");
            setHashtagSuggestions([]);
            setShowSuggestions(false);
            navigation.navigate("Home", {
              newPost: createdPost, // 🔥 temporary inject
            });
          },
        },
      ]);
    } catch (err) {
      error("Upload error:", err);
      Alert.alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCaptionChange = async (text) => {
    setCaption(text);

    const match = text.match(/#\w+$/);
    if (!match) {
      setShowSuggestions(false);
      return;
    }

    try {
      const query = match[0].replace("#", "");
      const res = await API.get(`/hashtags/search?q=${query}`);
      setHashtagSuggestions(res.data);
      setShowSuggestions(true);
    } catch {
      setShowSuggestions(false);
    }
  };

  return (
   
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.header}>Create Post</Text>

          {/* DISCUSSION TOGGLE */}
          <TouchableOpacity
            style={styles.discussionToggle}
            onPress={() => {
              setIsDiscussion(!isDiscussion);
              setFile(null); // 🔥 clear media when switching
            }}
          >
            <Text style={styles.discussionText}>
              {isDiscussion ? "💬 Discussion Post" : "📸 Normal Post"}
            </Text>
          </TouchableOpacity>
          <View style={styles.toggleRow}>
            <Text>Post Anonymously</Text>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
          </View>

          {/* MEDIA */}
          <TouchableOpacity style={styles.previewBox} onPress={pickMedia}>
            {file ? (
              <Image source={{ uri: file.uri }} style={styles.preview} />
            ) : (
              <Ionicons name="add-circle-outline" size={80} color="#aaa" />
            )}
          </TouchableOpacity>

          {/* CAPTION */}

          {/* 🔍 HASHTAG SUGGESTIONS (ABOVE INPUT) */}
          {showSuggestions && hashtagSuggestions.length > 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                marginBottom: 8,
                maxHeight: 160,
              }}
            >
              {hashtagSuggestions.map((h) => (
                <TouchableOpacity
                  key={h._id}
                  onPress={() => {
                    setCaption((prev) => prev.replace(/#\w+$/, `#${h.name} `));
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={{ padding: 10 }}>
                    #{h.name} · {h.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* <TextInput
        placeholder={
          isDiscussion ? "Start a discussion..." : "Write something..."
        }
        value={caption}
        onChangeText={async (text) => {
          setCaption(text);

          const match = text.match(/#\w+$/);
          if (!match) {
            setShowSuggestions(false);
            return;
          }

          const query = match[0].replace("#", "");
          const res = await API.get(`/hashtags/search?q=${query}`);
          setHashtagSuggestions(res.data);
          setShowSuggestions(true);
        }}
        style={styles.caption}
        multiline
      /> */}

          <TextInput
            placeholder={
              isDiscussion ? "Start a discussion..." : "Write something..."
            }
            value={caption}
            onChangeText={handleCaptionChange}
            style={styles.caption}
            multiline
          />

          {/* 😊 MOOD PICKER */}
          <View style={{ flexDirection: "row", marginVertical: 10 }}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMood(m.id)}
                style={{
                  padding: 10,
                  backgroundColor: mood === m.id ? "#ddd" : "#f5f5f5",
                  borderRadius: 8,
                  marginRight: 6,
                }}
              >
                <Text style={{ fontSize: 18 }}>{m.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAGS */}
          <View style={styles.tagContainer}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(tag)}
                style={[styles.tag, selectedTag === tag && styles.activeTag]}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTag === tag && styles.activeTagText,
                  ]}
                >
                  #{tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TOGGLE */}
          <View style={styles.toggleRow}>
            <Text>{isTemporary ? "24h Post" : "Permanent Post"}</Text>
            <Switch value={isTemporary} onValueChange={setIsTemporary} />
          </View>

          {/* BUTTON */}
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <TouchableOpacity style={styles.btn} onPress={uploadPost}>
              <Text style={styles.btnText}>UPLOAD</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  discussionToggle: {
    alignSelf: "center",
    marginBottom: 10,
  },
  discussionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  previewBox: {
    height: 250,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  preview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  caption: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  activeTag: {
    backgroundColor: "#000",
  },
  tagText: {
    color: "#000",
    fontSize: 14,
  },
  activeTagText: {
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  btn: {
    backgroundColor: "#2196F3",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
