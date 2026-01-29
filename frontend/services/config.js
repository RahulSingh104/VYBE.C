import { Platform } from "react-native";

const LOCAL_IP = "10.70.148.46"; // your PC IP

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
    // ✅ CURRENT LIVE BACKEND
    apiUrl: "https://vybe-c.onrender.com/api",
    baseUrl: "https://vybe-c.onrender.com",
    socketUrl: "https://vybe-c.onrender.com",
  },
};

export default __DEV__ ? ENV.development : ENV.production;
