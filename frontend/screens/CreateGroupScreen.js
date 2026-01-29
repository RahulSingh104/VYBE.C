import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import API from "../services/api";

export default function CreateGroupScreen({ navigation }) {
  const [selectedUsers, setSelectedUsers] = useState([]);

  const createGroup = async () => {
    if (selectedUsers.length > 5) return;

    const res = await API.post("/chat/group", {
      users: selectedUsers,
    });

    navigation.navigate("Chat", {
      roomId: res.data._id,
      isGroup: true,
    });
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Select up to 5 users</Text>

      {/* You already have SearchScreen — reuse it */}
      {/* On user select → push id into selectedUsers */}

      <TouchableOpacity
        disabled={selectedUsers.length > 5}
        onPress={createGroup}
      >
        <Text>Create Group</Text>
      </TouchableOpacity>
    </View>
  );
}
