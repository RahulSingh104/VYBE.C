import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import socket from "../services/socket";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SafeImage from "@/components/SafeImage";

export default function ChatScreen({ route }) {
  const { userId, roomId: groupRoomId, isGroup } = route.params || {};

  const [myUserId, setMyUserId] = useState(null);

  /* ---------------- STATE ---------------- */
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyMessage, setReplyMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const roomId = useRef(null);
  const typingTimeout = useRef(null);

  const navigation = useNavigation();

  /* ---------------- LOAD & SOCKET ---------------- */
  useEffect(() => {
    loadMessages();

    // 🔥 ROOM LOGIC (DM vs GROUP)
    if (isGroup) {
      roomId.current = groupRoomId;
      socket.connect();
      socket.emit("joinGroup", groupRoomId);
    } else {
      roomId.current = [userId].sort().join("_");
      socket.connect();
      socket.emit("joinRoom", roomId.current);
    }

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("userTyping", () => setIsTyping(true));
    socket.on("userStopTyping", () => setIsTyping(false));

    return () => {
      socket.off("receiveMessage");
      socket.off("userTyping");
      socket.off("userStopTyping");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        setMyUserId(JSON.parse(user).id);
      }
    })();
  }, []);

  /* ---------------- API ---------------- */
  const loadMessages = async () => {
    const token = await AsyncStorage.getItem("token");
    const res = await API.get(`/chat/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(res.data);
    console.log("📨 loading chat with user:", userId);
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await API.post(
        "/chat",
        {
          receiverId: userId,
          text,
          replyTo: replyMessage?._id || null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (isGroup) {
        socket.emit("sendGroupMessage", {
          roomId: roomId.current,
          message: res.data,
        });
      } else {
        socket.emit("sendMessage", {
          roomId: roomId.current,
          message: res.data,
        });
      }

      setMessages((prev) => [...prev, res.data]);
      setText("");
      setReplyMessage(null);
    } catch (err) {
      alert(err.response?.data?.message || "Message failed");
    }
  };

  /* ---------------- UI HELPERS ---------------- */
  const renderMessage = ({ item }) => {
    const isMe = item.sender?._id === myUserId;

    const avatarUri =
      typeof item.user?.profileImage === "string"
        ? item.user.profileImage
        : item.user?.profileImage?.url || "https://i.pravatar.cc/150";

    return (
      <TouchableOpacity
        onLongPress={() => setReplyMessage(item)}
        activeOpacity={0.7}
      >
        <View
          style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}
        >
          {!isMe && <SafeImage uri={avatarUri} style={styles.avatar} />}

          <View
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
          >
            {item.isForwarded && (
              <Text style={styles.forwarded}>↪ Forwarded</Text>
            )}

            {item.replyTo && (
              <Text style={styles.replyPreview}>Replying to message</Text>
            )}

            <Text style={styles.messageText}>{item.text}</Text>
          </View>
          {isMe && (
            <Image
              source={{
                uri: item.sender?.profileImage
                  ? item.user.profileImage
                  : "https://i.pravatar.cc/150",
              }}
              style={styles.avatar}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: "600" }}>
          Chat
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 12 }}
        />

        {isTyping && <Text style={styles.typingText}>Typing...</Text>}

        {replyMessage && (
          <View style={styles.replyBox}>
            <Text numberOfLines={1} style={styles.replyText}>
              Replying to: {replyMessage.text}
            </Text>
            <TouchableOpacity onPress={() => setReplyMessage(null)}>
              <Text style={{ color: "red" }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            placeholder="Type a message..."
            value={text}
            onChangeText={(value) => {
              setText(value);

              socket.emit(isGroup ? "groupTyping" : "typing", {
                roomId: roomId.current,
                userId,
              });

              clearTimeout(typingTimeout.current);
              typingTimeout.current = setTimeout(() => {
                socket.emit("stopTyping", {
                  roomId: roomId.current,
                  userId,
                });
              }, 800);
            }}
            style={styles.input}
          />

          <TouchableOpacity onPress={sendMessage}>
            <Text style={styles.send}>SEND</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 6,
  },
  myRow: { flexDirection: "row-reverse" },
  otherRow: { flexDirection: "row" },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
  },

  bubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 10,
  },
  myBubble: { backgroundColor: "#DCF8C6" },
  otherBubble: { backgroundColor: "#F1F1F1" },

  messageText: { fontSize: 15 },
  forwarded: { fontSize: 11, color: "#666" },
  replyPreview: { fontSize: 11, color: "#007AFF" },

  typingText: {
    paddingLeft: 12,
    fontSize: 12,
    color: "#666",
  },

  replyBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  replyText: { flex: 1, fontSize: 13 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
  },
  send: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
