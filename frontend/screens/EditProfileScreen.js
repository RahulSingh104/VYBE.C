import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";
import SafeImage from "../components/SafeImage";


export default function EditProfileScreen({ navigation }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [profileImage, setProfileImage] = useState(null);


  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await API.get("/users/me");
    setName(res.data.user.name);
    setBio(res.data.user.bio || "");
     setProfileImage(res.data.user.profileImage);
  };

  const pickImage = async () => {
  const { status } =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert("Permission required", "Allow gallery access");
    return;
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!res.canceled) {
    setAvatar(res.assets[0]);
  }
};


  const saveProfile = async () => {
  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);

    if (avatar) {
      formData.append("profileImage", {
        uri:
          Platform.OS === "android"
            ? avatar.uri
            : avatar.uri.replace("file://", ""),
        type: "image/jpeg",
        name: "profile.jpg",
      });
    }

    await API.put("/users/me", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    Alert.alert("Success", "Profile updated");
    navigation.goBack();
  } catch (err) {
    console.log("PROFILE UPDATE ERROR:", err.response?.data || err.message);
    Alert.alert("Upload failed", "Please try again");
  }
};

const avatarUri =
  avatar?.uri ||
  (typeof profileImage === "string"
    ? profileImage
    : profileImage?.url) ||
  "https://i.pravatar.cc/150";



  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} />
  </TouchableOpacity>

  <Text style={styles.title}></Text>

  <View style={{ width: 24 }} /> 
</View>

      <Text style={styles.title}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarBox}>
        <SafeImage
          uri={avatarUri}
          style={styles.avatar}
        />
        <Text style={styles.changeText}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        style={styles.input}
      />

      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
        style={[styles.input, { height: 80 }]}
        multiline
      />

      <TouchableOpacity style={styles.btn} onPress={saveProfile}>
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  avatarBox: {
    alignItems: "center",
    marginBottom: 20,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  changeText: {
    color: "#2196F3",
    marginTop: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },

  btn: {
    backgroundColor: "#2196F3",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  topBar: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 15,
},
});
