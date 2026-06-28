import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket.js";
import { generateRSAKeyPair, savePrivateKey } from "../lib/encryption.js";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");

      // Generate E2E encryption keys
      const { publicKey, privateKey } = await generateRSAKeyPair();
      savePrivateKey(res.data._id, privateKey);
      await axiosInstance.put("/auth/public-key", { publicKey });

      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null, onlineUsers: [] });
      disconnectSocket();
      toast.success("Logged out");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    // Avoid duplicate listeners if already connected
    const existing = getSocket();
    if (existing?.connected) {
      // Re-attach listeners in case they were lost
      get()._attachSocketListeners(existing);
      set({ socket: existing });
      return;
    }

    const socket = connectSocket(authUser._id);
    set({ socket });
    get()._attachSocketListeners(socket);
  },

  // ── Separated so we can re-attach without reconnecting ────
  _attachSocketListeners: (socket) => {
    // Remove old listeners to avoid duplicates
    socket.off("getOnlineUsers");
    socket.off("userOffline");
    socket.off("userProfileUpdated");

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("userOffline", ({ userId }) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
    });

    // ── Fix #4: update profile pic shown to OTHER users in real-time ──
    socket.on("userProfileUpdated", ({ userId, fullName, profilePic, customStatus, bio }) => {
      // Update the users list in useChatStore so sidebar + chat header refresh
      // We import lazily to avoid circular dependency
      import("./useChatStore.js").then(({ useChatStore }) => {
        useChatStore.getState().updateUserInList({ userId, fullName, profilePic, customStatus, bio });
      });
      // Also update the group member list
      import("./useGroupStore.js").then(({ useGroupStore }) => {
        useGroupStore.getState().updateMemberProfile({ userId, fullName, profilePic });
      });
    });
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
