import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { getSocket } from "../lib/socket.js";

export const useCallStore = create((set, get) => ({
  incomingCall: null,
  activeCall: null,
  callHistory: [],
  isCallHistoryLoading: false,
  isCallActive: false,
  localStream: null,
  remoteStreams: {},
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call, isCallActive: !!call }),

  acceptCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    set({ activeCall: { ...incomingCall, isInitiator: false }, incomingCall: null, isCallActive: true });
  },

  rejectCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    const socket = getSocket();
    socket?.emit("rejectCall", { callerId: incomingCall.callerId, roomId: incomingCall.roomId });
    set({ incomingCall: null });
  },

  endCall: () => {
    const { activeCall, localStream } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (activeCall) {
      const socket = getSocket();
      socket?.emit("endCall", {
        peerId: activeCall.callerId || activeCall.receiverId,
        roomId: activeCall.roomId,
      });
    }
    set({
      activeCall: null,
      isCallActive: false,
      localStream: null,
      remoteStreams: {},
      isScreenSharing: false,
      isMuted: false,
      isVideoOff: false,
    });
  },

  setLocalStream: (stream) => set({ localStream: stream }),

  addRemoteStream: (userId, stream) =>
    set((state) => ({ remoteStreams: { ...state.remoteStreams, [userId]: stream } })),

  removeRemoteStream: (userId) =>
    set((state) => {
      const updated = { ...state.remoteStreams };
      delete updated[userId];
      return { remoteStreams: updated };
    }),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    set({ isVideoOff: !isVideoOff });
  },

  // ── Fix #3: load call history from backend ─────────────
  getCallHistory: async () => {
    set({ isCallHistoryLoading: true });
    try {
      const res = await axiosInstance.get("/calls/history");
      set({ callHistory: res.data });
    } catch {
      toast.error("Failed to load call history");
    } finally {
      set({ isCallHistoryLoading: false });
    }
  },

  // Add a call to local history immediately when initiated/received
  addCallToHistory: (call) =>
    set((state) => ({ callHistory: [call, ...state.callHistory] })),

  subscribeToCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("incomingCall", (data) => {
      set({ incomingCall: data });
    });

    socket.on("callRejected", () => {
      toast.error("Call was declined");
      // Log missed call
      get().getCallHistory();
      get().endCall();
    });

    socket.on("callEnded", () => {
      get().endCall();
      // Refresh history after call ends
      get().getCallHistory();
    });

    socket.on("callAccepted", () => {
      // Refresh after answered
      setTimeout(() => get().getCallHistory(), 2000);
    });
  },

  unsubscribeFromCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off("incomingCall");
    socket.off("callRejected");
    socket.off("callEnded");
    socket.off("callAccepted");
  },
}));
