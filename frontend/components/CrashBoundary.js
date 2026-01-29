import React from "react";
import { View, Text, Button } from "react-native";

export default class CrashBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.log("APP CRASH:", error);
  }

  ifCrash() {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <Text style={{ fontSize:18, marginBottom:10 }}>
          Something went wrong
        </Text>
        <Button title="Reload App" onPress={() => this.setState({ hasError:false })}/>
      </View>
    );
  }

  render() {
    if (this.state.hasError) return this.ifCrash();
    return this.props.children;
  }
}
