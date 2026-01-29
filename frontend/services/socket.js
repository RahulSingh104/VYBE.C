// import { io } from "socket.io-client";
// import ENV from "./config";

// const socket = io(ENV.socketUrl, {
//   transports: ["websocket"],
//   autoConnect: true,
// });

// export default socket;


//  this code for local app run


// import { io } from "socket.io-client";

// let socket;

// export const getSocket = () => {
//   if (!socket) {
//     socket = io("http://localhost:5000", {
//       transports: ["websocket"],
//       autoConnect: true,
//     });
//   }
//   return socket;
// };

import { io } from "socket.io-client";
import ENV from "./config";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(ENV.socketUrl, {
      transports: ["websocket"],

      autoConnect: true,

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 8000,

      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("⚠ Socket Disconnected:", reason);
    });

    socket.on("reconnect", () => {
      console.log("♻ Socket Reconnected");
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket Error:", err.message);
    });
  }

  return socket;
};
