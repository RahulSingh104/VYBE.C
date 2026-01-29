import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ENV from "./config";

const API = axios.create({
  baseURL: ENV.apiUrl,
});

API.interceptors.request.use(async (req) => {
  const token = await AsyncStorage.getItem("token");
  if (token) { req.headers.Authorization = `Bearer ${token}`; 
  }
  return req;
});

export default API;
