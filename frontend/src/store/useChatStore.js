import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { getSocket } from "../lib/socket.js";

// ── Time formatter matching WhatsApp style ──────────────────
export const formatConvTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ── Message preview text ────────────────────────────────────
export const buildPreview = (msg) => {
  if (!msg) return "";
  if (msg.isDeletedForEveryone) return "🚫 Deleted message";
  if (msg.fileType === "video" || msg.messageType === "video") return "🎥 Video";
  if (msg.fileType === "image" || msg.image || msg.messageType === "image") return "📷 Photo";
  if (msg.fileUrl || msg.fileName) return `📄 ${msg.fileName || "Document"}`;
  return msg.text || "";
};

export const useChatStore = create((set, get) => ({
  // ── Conversation list (WhatsApp sidebar) ───────────────
  conversations: [],       // [{ user, lastMessage, unreadCount }]
  isConvsLoading: false,

  // ── Full user list (for group creation only) ───────────
  users: [],
  isUsersLoading: false,

  // ── Open chat state ────────────────────────────────────
  messages: [],
  selectedUser: null,
  isMessagesLoading: false,
  typingUsers: {},
  replyTo: null,
  searchResults: null,
  isSearching: false,
  pinnedMessages: [],
  wallpaper: localStorage.getItem("chat-wallpaper") || "",

  // ─── CONVERSATIONS ─────────────────────────────────────
  getConversations: async () => {
    set({ isConvsLoading: true });
    try {
      const res = await axiosInstance.get("/messages/conversations");
      set({ conversations: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      set({ isConvsLoading: false });
    }
  },

  // Called by socket "conversationUpdated" event
  upsertConversation: ({ peer, message, preview, unreadIncrement, status }) => {
    set((state) => {
      const peerId = peer?._id?.toString();
      const existing = state.conversations.find(
        (c) => c.user._id.toString() === peerId
      );

      const updated = existing
        ? {
            ...existing,
            user: { ...existing.user, ...peer },
            lastMessage: {
              ...message,
              preview,
              status: status || message.status,
            },
            unreadCount: unreadIncrement
              ? (existing.unreadCount || 0) + 1
              : existing.unreadCount || 0,
          }
        : {
            user: peer,
            lastMessage: { ...message, preview },
            unreadCount: unreadIncrement ? 1 : 0,
          };

      // Move to top
      const rest = state.conversations.filter(
        (c) => c.user._id.toString() !== peerId
      );
      return { conversations: [updated, ...rest] };
    });
  },

  // When sender receives "conversationSeenUpdate" — set all to "seen"
  markConversationSeen: (peerId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.user._id.toString() === peerId
          ? {
              ...c,
              lastMessage: c.lastMessage
                ? { ...c.lastMessage, status: "seen" }
                : c.lastMessage,
            }
          : c
      ),
    }));
  },

  clearUnread: (peerId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.user._id.toString() === peerId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  // ─── FULL USER LIST (group creation) ──────────────────
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  updateUserInList: ({ userId, fullName, profilePic, customStatus, bio }) => {
    set((state) => ({
      users: state.users.map((u) =>
        u._id === userId ? { ...u, fullName, profilePic, customStatus, bio } : u
      ),
      conversations: state.conversations.map((c) =>
        c.user._id.toString() === userId
          ? { ...c, user: { ...c.user, fullName, profilePic, customStatus, bio } }
          : c
      ),
      selectedUser:
        state.selectedUser?._id === userId
          ? { ...state.selectedUser, fullName, profilePic, customStatus, bio }
          : state.selectedUser,
      messages: state.messages.map((m) =>
        (m.senderId?._id || m.senderId) === userId
          ? { ...m, senderId: { ...(m.senderId || {}), profilePic, fullName } }
          : m
      ),
    }));
  },

  // ─── MESSAGES ──────────────────────────────────────────
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data], replyTo: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/edit`, { text });
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? res.data : m)),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId, deleteType) => {
    try {
      await axiosInstance.put(`/messages/${messageId}/delete`, { deleteType });
      if (deleteType === "foreveryone") {
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, text: "", image: "", fileUrl: "" }
              : m
          ),
        }));
      } else {
        set((state) => ({ messages: state.messages.filter((m) => m._id !== messageId) }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  pinMessage: async (messageId, pin) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/pin`, { pin });
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? res.data : m)),
      }));
      toast.success(pin ? "Message pinned" : "Message unpinned");
    } catch (error) {
      toast.error("Failed to pin message");
    }
  },

  markAsSeen: async (senderId) => {
    try {
      await axiosInstance.post("/messages/seen", { senderId });
      get().clearUnread(senderId);
    } catch {}
  },

  getPinnedMessages: async (userId) => {
    try {
      const res = await axiosInstance.get(`/messages/${userId}/pinned`);
      set({ pinnedMessages: res.data });
    } catch {}
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosInstance.post("/messages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  searchMessages: async (query, userId) => {
    set({ isSearching: true });
    try {
      const params = { q: query };
      if (userId) params.userId = userId;
      const res = await axiosInstance.get("/messages/search", { params });
      set({ searchResults: res.data });
    } catch {
      toast.error("Search failed");
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearch: () => set({ searchResults: null }),

  // ─── SOCKET SUBSCRIPTIONS ──────────────────────────────
  subscribeToMessages: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("newMessage", (message) => {
    console.log("NEW MESSAGE", message._id);
    const { selectedUser } = get();
    const senderId = message.senderId?._id || message.senderId;

    if (selectedUser && senderId === selectedUser._id) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }
  });

    socket.on("conversationUpdated", (payload) => {
      get().upsertConversation(payload);
    });

    socket.on("conversationSeenUpdate", ({ peerId }) => {
      get().markConversationSeen(peerId);
    });

    socket.on("messageEdited", (message) => {
      if (!message.groupId) {
        set((state) => ({
          messages: state.messages.map((m) => (m._id === message._id ? message : m)),
        }));
      }
    });

    socket.on("messageDeleted", ({ messageId, deleteType }) => {
      set((state) => ({
        messages:
          deleteType === "foreveryone"
            ? state.messages.map((m) =>
                m._id === messageId
                  ? { ...m, isDeletedForEveryone: true, text: "", image: "", fileUrl: "" }
                  : m
              )
            : state.messages.filter((m) => m._id !== messageId),
      }));
    });

    socket.on("messagesSeen", ({ seenBy, senderId }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          const isMine = (m.senderId?._id || m.senderId) === senderId;
          if (!isMine) return m;
          return {
            ...m,
            status: "seen",
            seenBy: m.seenBy?.some((s) => (s.userId || s) === seenBy)
              ? m.seenBy
              : [...(m.seenBy || []), { userId: seenBy, seenAt: new Date() }],
          };
        }),
      }));
    });

    socket.on("messagesDeliveredUpdate", () => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.status === "sent" ? { ...m, status: "delivered" } : m
        ),
      }));
    });

    socket.on("messagePinned", ({ message }) => {
      set((state) => ({
        messages: state.messages.map((m) => (m._id === message._id ? message : m)),
      }));
    });

    socket.on("userTyping", ({ senderId }) => {
      set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
    });

    socket.on("userStopTyping", ({ senderId }) => {
      set((state) => {
        const updated = { ...state.typingUsers };
        delete updated[senderId];
        return { typingUsers: updated };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = getSocket();
    if (!socket) return;
    [
      "newMessage", "conversationUpdated", "conversationSeenUpdate",
      "messageEdited", "messageDeleted", "messagesSeen",
      "messagesDeliveredUpdate", "messagePinned",
      "userTyping", "userStopTyping",
    ].forEach((e) => socket.off(e));
  },

  setReplyTo: (message) => set({ replyTo: message }),
  clearReplyTo: () => set({ replyTo: null }),
  setSelectedUser: (user) => set({ selectedUser: user }),
}));
