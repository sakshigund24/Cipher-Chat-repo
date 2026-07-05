import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { getSocket } from "../lib/socket.js";

// ── Ringtone helper ────────────────────────────────────────
let ringtoneAudio = null;

const startRingtone = () => {
  try {
    // Use Web Audio API to generate a ringing tone — no external file needed
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let ringing = true;

    const ring = () => {
      if (!ringing) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
      setTimeout(() => { if (ringing) ring(); }, 1500);
    };

    ring();
    ringtoneAudio = { stop: () => { ringing = false; ctx.close(); } };
  } catch {}
};

const stopRingtone = () => {
  if (ringtoneAudio) { ringtoneAudio.stop(); ringtoneAudio = null; }
};

export const useCallStore = create((set, get) => ({
  incomingCall:          null,
  activeCall:            null,
  callHistory:           [],
  isCallHistoryLoading:  false,
  isCallActive:          false,
  localStream:           null,
  remoteStreams:         {},
  isMuted:               false,
  isVideoOff:            false,
  isScreenSharing:       false,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall:   (call) => set({ activeCall: call, isCallActive: !!call }),

  // ── Callee accepts ────────────────────────────────────
  acceptCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    stopRingtone();
    set({
      activeCall: {
        ...incomingCall,
        isInitiator: false,
        // keep signalData so CallWindow can feed it into the peer immediately
        peerInfo: {
          _id:        incomingCall.callerId,
          fullName:   incomingCall.callerInfo?.fullName,
          profilePic: incomingCall.callerInfo?.profilePic,
        },
      },
      incomingCall:  null,
      isCallActive:  true,
    });
  },

  // ── Callee rejects ────────────────────────────────────
  rejectCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;
    stopRingtone();
    const socket = getSocket();
    socket?.emit("rejectCall", {
      callerId: incomingCall.callerId,
      roomId:   incomingCall.roomId,
    });
    // Log declined call
    try {
      await axiosInstance.post("/calls", {
        receiverId: incomingCall.callerId,
        callType:   incomingCall.callType,
        callMode:   "direct",
        status:     "declined",
        endedAt:    new Date(),
        duration:   0,
      });
    } catch {}
    set({ incomingCall: null });
    get().getCallHistory();
  },

  // ── Caller / callee ends call ─────────────────────────
  endCall: () => {
    stopRingtone();
    const { activeCall, localStream } = get();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (activeCall) {
      const socket = getSocket();
      const peerId = activeCall.isInitiator
        ? activeCall.receiverId
        : activeCall.callerId;
      if (peerId) socket?.emit("endCall", { peerId, roomId: activeCall.roomId });
    }
    set({
      activeCall:    null,
      isCallActive:  false,
      localStream:   null,
      remoteStreams: {},
      isScreenSharing: false,
      isMuted:       false,
      isVideoOff:    false,
    });
  },

  setLocalStream:    (stream)       => set({ localStream: stream }),
  addRemoteStream:   (uid, stream)  =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [uid]: stream } })),
  removeRemoteStream: (uid) =>
    set((s) => { const r = { ...s.remoteStreams }; delete r[uid]; return { remoteStreams: r }; }),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    set({ isMuted: !isMuted });
  },
  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    set({ isVideoOff: !isVideoOff });
  },

  // ── Call history ──────────────────────────────────────
  getCallHistory: async () => {
    set({ isCallHistoryLoading: true });
    try {
      const res = await axiosInstance.get("/calls/history");
      set({ callHistory: res.data });
    } catch {}
    finally { set({ isCallHistoryLoading: false }); }
  },

  // ── Socket subscriptions (called from App.jsx) ────────
  subscribeToCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;

    // Remove any stale listeners first
    socket.off("incomingCall");
    socket.off("callRejected");
    socket.off("callEnded");

    // ── Someone is calling us ──────────────────────────
    socket.on("incomingCall", (data) => {
      const state = get();
      // Ignore if we're already in a call
      if (state.isCallActive || state.incomingCall) return;

      startRingtone();
      set({ incomingCall: data });

      // Browser notification (if permission granted)
      if (Notification.permission === "granted") {
        new Notification(`📞 Incoming ${data.callType} call`, {
          body: `${data.callerInfo?.fullName} is calling…`,
          icon: data.callerInfo?.profilePic || "/avatar.png",
          tag:  "incoming-call",
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") {
            new Notification(`📞 Incoming ${data.callType} call`, {
              body: `${data.callerInfo?.fullName} is calling…`,
              icon: data.callerInfo?.profilePic || "/avatar.png",
              tag:  "incoming-call",
            });
          }
        });
      }

      // Auto-dismiss after 45 s (missed call)
      setTimeout(() => {
        if (get().incomingCall?.roomId === data.roomId) {
          stopRingtone();
          set({ incomingCall: null });
          // Log as missed
          axiosInstance.post("/calls", {
            receiverId: data.callerId,
            callType:   data.callType,
            callMode:   "direct",
            status:     "missed",
            duration:   0,
          }).then(() => get().getCallHistory()).catch(() => {});
        }
      }, 45000);
    });

    socket.on("callRejected", () => {
      toast.error("Call was declined");
      get().endCall();
      setTimeout(() => get().getCallHistory(), 500);
    });

    // callEnded is handled inside CallWindow; nothing to do here
    socket.on("callEnded", () => {});
  },

  unsubscribeFromCallEvents: () => {
    const socket = getSocket();
    if (!socket) return;
    socket.off("incomingCall");
    socket.off("callRejected");
    socket.off("callEnded");
    stopRingtone();
  },
}));
