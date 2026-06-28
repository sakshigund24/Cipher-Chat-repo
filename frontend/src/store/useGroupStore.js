import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { getSocket } from "../lib/socket.js";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  typingUsers: {},

  getMyGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (data) => {
    try {
      const res = await axiosInstance.post("/groups", data);
      set((state) => ({ groups: [res.data, ...state.groups] }));
      toast.success("Group created!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  updateGroup: async (groupId, data) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, data);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Group updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  addMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Members added!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },

  removeMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.success("Left group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: null,
      }));
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  makeAdmin: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/members/${memberId}/admin`);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Admin role granted!");
    } catch (error) {
      toast.error("Failed to make admin");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error("Failed to load group messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      set((state) => ({ groupMessages: [...state.groupMessages, res.data] }));
    } catch (error) {
      toast.error("Failed to send message");
    }
  },

  markGroupMessagesSeen: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/seen`);
    } catch {}
  },

  setSelectedGroup: (group) => {
    set({ selectedGroup: group, groupMessages: [] });
    if (group) {
      const socket = getSocket();
      socket?.emit("joinGroup", group._id);
    }
  },

  // ── Fix #4: patch member profile pic inside group members array ──
  updateMemberProfile: ({ userId, fullName, profilePic }) => {
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        members: g.members.map((m) => {
          const mId = m.userId?._id || m.userId;
          if (mId?.toString() === userId?.toString()) {
            return { ...m, userId: { ...(m.userId || {}), _id: mId, fullName, profilePic } };
          }
          return m;
        }),
      })),
      selectedGroup: state.selectedGroup
        ? {
            ...state.selectedGroup,
            members: state.selectedGroup.members.map((m) => {
              const mId = m.userId?._id || m.userId;
              if (mId?.toString() === userId?.toString()) {
                return { ...m, userId: { ...(m.userId || {}), _id: mId, fullName, profilePic } };
              }
              return m;
            }),
          }
        : null,
      // Patch avatar inside group messages too
      groupMessages: state.groupMessages.map((msg) =>
        (msg.senderId?._id || msg.senderId)?.toString() === userId?.toString()
          ? { ...msg, senderId: { ...(msg.senderId || {}), profilePic, fullName } }
          : msg
      ),
    }));
  },

  subscribeToGroupMessages: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("newGroupMessage", (message) => {
      const { selectedGroup } = get();
      if (selectedGroup && message.groupId === selectedGroup._id) {
        set((state) => ({ groupMessages: [...state.groupMessages, message] }));
      }
    });

    socket.on("messageEdited", (message) => {
      if (message.groupId) {
        set((state) => ({
          groupMessages: state.groupMessages.map((m) => (m._id === message._id ? message : m)),
        }));
      }
    });

    socket.on("messageDeleted", ({ messageId, deleteType }) => {
      set((state) => ({
        groupMessages:
          deleteType === "foreveryone"
            ? state.groupMessages.map((m) =>
                m._id === messageId
                  ? { ...m, isDeletedForEveryone: true, text: "", image: "", fileUrl: "" }
                  : m
              )
            : state.groupMessages.filter((m) => m._id !== messageId),
      }));
    });

    socket.on("groupUpdated", (group) => {
      set((state) => ({
        groups: state.groups.map((g) => (g._id === group._id ? group : g)),
        selectedGroup: state.selectedGroup?._id === group._id ? group : state.selectedGroup,
      }));
    });

    socket.on("groupMembersUpdated", (group) => {
      set((state) => ({
        groups: state.groups.map((g) => (g._id === group._id ? group : g)),
        selectedGroup: state.selectedGroup?._id === group._id ? group : state.selectedGroup,
      }));
    });

    socket.on("groupDeleted", ({ groupId }) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.error("Group was deleted by admin");
    });

    socket.on("removedFromGroup", ({ groupId }) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.error("You were removed from a group");
    });

    socket.on("addedToGroup", (group) => {
      set((state) => ({ groups: [group, ...state.groups] }));
      toast.success(`Added to group: ${group.name}`);
    });

    socket.on("userTyping", ({ senderId, groupId }) => {
      if (groupId) {
        set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
        setTimeout(() => {
          set((state) => {
            const updated = { ...state.typingUsers };
            delete updated[senderId];
            return { typingUsers: updated };
          });
        }, 3000);
      }
    });

    socket.on("userStopTyping", ({ senderId, groupId }) => {
      if (groupId) {
        set((state) => {
          const updated = { ...state.typingUsers };
          delete updated[senderId];
          return { typingUsers: updated };
        });
      }
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off("newGroupMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("groupUpdated");
    socket.off("groupMembersUpdated");
    socket.off("groupDeleted");
    socket.off("removedFromGroup");
    socket.off("addedToGroup");
    socket.off("userTyping");
    socket.off("userStopTyping");
  },
}));
