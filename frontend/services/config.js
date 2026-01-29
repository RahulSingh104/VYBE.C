import { Platform } from "react-native";

const LOCAL_IP ="10.70.148.46"; // ✅ your PC IPv4

const ENV = {
  development: {
    apiUrl:
      Platform.OS === "web"
        ? "http://localhost:5000/api"
        : `http://${LOCAL_IP}:5000/api`,

    baseUrl:
      Platform.OS === "web"
        ? "http://localhost:5000"
        : `http://${LOCAL_IP}:5000`,

    socketUrl:
      Platform.OS === "web"
        ? "http://localhost:5000"
        : `http://${LOCAL_IP}:5000`,
  },

  production: {
    apiUrl: "https://api.vybe.c.com/api", // future
    baseUrl: "https://api.vybe.c.com",
    socketUrl: "https://api.vybe.c.com",
  },
};

export default __DEV__ ? ENV.development : ENV.production;
