import React from "react";
import {  StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SafeScreen({ children, style }) {
  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          backgroundColor: "#fff",
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
