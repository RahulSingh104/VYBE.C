import "react-native-gesture-handler";
import StackNavigator from "./navigation/StackNavigator";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import CrashBoundary from "./components/CrashBoundary";
import useSocketLifecycle from "./hooks/useSocketLifecycle";
import UniversalScreen from "./components/UniversalScreen";



export default function App() {

  useSocketLifecycle();
  return (
    <CrashBoundary>
     <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={true}
      />

      <PaperProvider>
        <UniversalScreen>
        <StackNavigator />
        </UniversalScreen>
      </PaperProvider>
    </SafeAreaProvider>
    </CrashBoundary>
  );
}
