import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    query: { userId },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
  socket = null;
};

export const getSocket = () => socket;
