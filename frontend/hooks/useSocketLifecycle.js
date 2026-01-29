import { useEffect } from "react";
import { AppState } from "react-native";
import { getSocket } from "../services/socket";

export default function useSocketLifecycle() {

  useEffect(() => {

    const handleState = (state) => {
      const socket = getSocket();

      if (state === "active") {
        if (!socket.connected) {
          socket.connect();
        }
      }
    };

    const sub = AppState.addEventListener("change", handleState);

    return () => sub.remove();

  }, []);

}
