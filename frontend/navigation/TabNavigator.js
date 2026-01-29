import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import UploadScreen from "../screens/UploadScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScreen from "../screens/SearchScreen";



import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
     screenOptions={({ route }) => ({
  headerShown: false,
  tabBarShowLabel: false,
  tabBarStyle: {
    height: 65,
  },
  tabBarItemStyle: {
    flex: 1,   // 🔥 THIS FIXES GAP
  },
  tabBarIcon: ({ color, size, focused }) => {
    let icon;
    if (route.name === "Home") icon = focused ? "home" : "home-outline";
    if (route.name === "Upload") icon = focused ? "add-circle" : "add-circle-outline";
     if (route.name === "Search") icon = focused ? "search" : "search-outline";
    if (route.name === "Profile") icon = focused ? "person" : "person-outline";
    return <Ionicons name={icon} size={size} color={color} />;
  },
})}

    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
