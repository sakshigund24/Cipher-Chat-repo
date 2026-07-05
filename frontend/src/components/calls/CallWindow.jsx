import { useEffect, useRef, useState } from "react";
import { useCallStore } from "../../store/useCallStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { getSocket } from "../../lib/socket.js";
import { axiosInstance } from "../../lib/axios.js";
import Peer from "simple-peer";
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, Minimize2, Maximize2,
} from "lucide-react";

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const CallWindow = () => {
  const {
    activeCall, endCall, localStream, setLocalStream,
    addRemoteStream, isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo, getCallHistory,
  } = useCallStore();
  const { authUser } = useAuthStore();

  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const peerRef         = useRef(null);
  const screenStreamRef = useRef(null);
  const callRecordRef   = useRef(null);   // DB call _id
  const callStartRef    = useRef(null);   // timestamp when media connected
  const cleanupFnsRef   = useRef([]);     // socket listeners to remove on unmount

  const [isMinimized,   setIsMinimized]   = useState(false);
  const [callDuration,  setCallDuration]  = useState(0);
  const [isConnected,   setIsConnected]   = useState(false);
  const [statusMsg,     setStatusMsg]     = useState(
    activeCall?.isInitiator ? "Calling…" : "Connecting…"
  );

  // ── Attach local video ref once it renders ─────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Attach remote video ref once it renders ────────────
  const setRemoteRef = (el) => {
    if (el) {
      remoteVideoRef.current = el;
      // If stream already arrived before ref mounted, attach it now
      const streams = Object.values(useCallStore.getState().remoteStreams);
      if (streams.length > 0) {
        el.srcObject = streams[0];
        el.play().catch(() => {});
      }
    }
  };

  // ── Log call to DB (only once, when stream arrives) ────
  const persistStart = async () => {
    if (callRecordRef.current) return;
    try {
      const peerId = activeCall.isInitiator
        ? activeCall.receiverId
        : activeCall.callerId;
      const res = await axiosInstance.post("/calls", {
        receiverId: peerId,
        callType:   activeCall.callType,
        callMode:   "direct",
        status:     "ongoing",
        startedAt:  new Date(),
      });
      callRecordRef.current = res.data._id;
      callStartRef.current  = Date.now();
    } catch {}
  };

  // ── End call: update DB, notify peer, clean up ─────────
  const handleEndCall = async () => {
    // Remove all socket listeners registered by this component
    const socket = getSocket();
    cleanupFnsRef.current.forEach(({ event, fn }) => socket?.off(event, fn));

    peerRef.current?.destroy();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    // Update DB record
    if (callRecordRef.current) {
      const duration = callStartRef.current
        ? Math.floor((Date.now() - callStartRef.current) / 1000)
        : 0;
      try {
        await axiosInstance.put(`/calls/${callRecordRef.current}`, {
          status:   "ended",
          endedAt:  new Date(),
          duration,
        });
      } catch {}
    }

    getCallHistory();
    endCall();   // clears Zustand state — unmounts this component
  };

  // ── Core WebRTC — runs once on mount ──────────────────
  useEffect(() => {
    if (!activeCall) return;
    const socket = getSocket();
    let peer;

    const boot = async () => {
      // 1. Acquire media
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeCall.callType === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
        });
      } catch (err) {
        const msg =
          err.name === "NotAllowedError" ? "Camera/mic permission denied" :
          err.name === "NotFoundError"   ? "Camera/mic not found" :
          "Cannot access media";
        setStatusMsg(msg);
        return;
      }

      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2. Create SimplePeer — trickle:false = single full SDP exchange
      peer = new Peer({
        initiator: activeCall.isInitiator,
        trickle:   false,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302"  },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });
      peerRef.current = peer;

      // 3. Peer signal ready → send via socket
      peer.on("signal", (sdp) => {
        if (activeCall.isInitiator) {
          // Caller → send offer
          socket?.emit("callUser", {
            receiverId: activeCall.receiverId,
            callType:   activeCall.callType,
            signalData: sdp,
            callerInfo: {
              fullName:   authUser.fullName,
              profilePic: authUser.profilePic,
            },
            roomId: activeCall.roomId,
          });
        } else {
          // Callee → send answer
          socket?.emit("answerCall", {
            callerId:   activeCall.callerId,
            signalData: sdp,
            roomId:     activeCall.roomId,
          });
        }
      });

      // 4. Remote stream → attach to <video>
      peer.on("stream", (remoteStream) => {
        addRemoteStream(
          activeCall.isInitiator ? activeCall.receiverId : activeCall.callerId,
          remoteStream
        );
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setIsConnected(true);
        setStatusMsg("Connected");
        persistStart();
      });

      peer.on("connect", () => { setIsConnected(true); setStatusMsg("Connected"); });
      peer.on("close",   () => setStatusMsg("Call ended"));
      peer.on("error",   (e) => {
        console.error("Peer error:", e);
        setStatusMsg("Connection error — check network");
      });

      // 5. Callee: immediately signal the SDP offer that was stored in activeCall
      if (!activeCall.isInitiator && activeCall.signalData) {
        peer.signal(activeCall.signalData);
      }

      // 6. Caller: wait for callee's SDP answer
      const onCallAccepted = ({ signalData }) => {
        if (peer && !peer.destroyed) peer.signal(signalData);
      };
      socket?.on("callAccepted", onCallAccepted);
      cleanupFnsRef.current.push({ event: "callAccepted", fn: onCallAccepted });

      // 7. Other side hung up
      const onCallEnded = () => handleEndCall();
      socket?.on("callEnded", onCallEnded);
      cleanupFnsRef.current.push({ event: "callEnded", fn: onCallEnded });
    };

    boot();

    return () => {
      // Cleanup on unmount
      const socket = getSocket();
      cleanupFnsRef.current.forEach(({ event, fn }) => socket?.off(event, fn));
      peer?.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Duration counter ───────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  // ── Screen share ───────────────────────────────────────
  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const cam   = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const track = cam.getVideoTracks()[0];
        peerRef.current?._pc?.getSenders()
          .find((s) => s.track?.kind === "video")
          ?.replaceTrack(track);
        if (localVideoRef.current) localVideoRef.current.srcObject = cam;
      } catch {}
      useCallStore.setState({ isScreenSharing: false });
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const track = screen.getVideoTracks()[0];
        peerRef.current?._pc?.getSenders()
          .find((s) => s.track?.kind === "video")
          ?.replaceTrack(track);
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        useCallStore.setState({ isScreenSharing: true });
        track.onended = () => handleScreenShare();
      } catch (err) { console.error("Screen share:", err); }
    }
  };

  const peerInfo = activeCall?.peerInfo || {
    fullName:   activeCall?.callerInfo?.fullName,
    profilePic: activeCall?.callerInfo?.profilePic,
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      className={`fixed z-[90] shadow-2xl overflow-hidden rounded-2xl transition-all duration-300
        ${isMinimized ? "bottom-4 right-4 w-72 h-52" : "inset-0 md:inset-6 lg:inset-10"}`}
    >
      <div className="relative w-full h-full bg-gray-900 flex items-center justify-center select-none">

        {/* ── Remote video / voice ── */}
        {activeCall?.callType === "video" ? (
          <video
            ref={setRemoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <span className={`absolute inset-0 rounded-full bg-white/10
                ${isConnected ? "" : "animate-ping"}`} />
              <img
                src={peerInfo?.profilePic || "/avatar.png"}
                alt=""
                className="relative w-32 h-32 rounded-full object-cover ring-4 ring-white/20"
              />
            </div>
            <p className="text-white text-xl font-semibold">{peerInfo?.fullName}</p>
            <p className="text-white/60 text-sm">
              {isConnected ? fmt(callDuration) : statusMsg}
            </p>
          </div>
        )}

        {/* ── Local PiP ── */}
        {activeCall?.callType === "video" && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`absolute rounded-xl object-cover border-2 border-white/20 shadow-xl bg-gray-800
              ${isMinimized ? "bottom-12 right-2 w-16 h-12" : "bottom-20 right-4 w-40 h-28"}`}
          />
        )}

        {/* ── Video overlay: name + duration ── */}
        {activeCall?.callType === "video" && !isMinimized && (
          <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none">
            <p className="text-white font-semibold text-lg drop-shadow">{peerInfo?.fullName}</p>
            <p className="text-white/60 text-sm drop-shadow">
              {isConnected ? fmt(callDuration) : statusMsg}
            </p>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
              ${isMuted ? "bg-red-500" : "bg-white/20 hover:bg-white/30"} text-white`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {activeCall?.callType === "video" && !isMinimized && (
            <>
              <button
                onClick={toggleVideo}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                  ${isVideoOff ? "bg-red-500" : "bg-white/20 hover:bg-white/30"} text-white`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                onClick={handleScreenShare}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                  ${isScreenSharing ? "bg-yellow-500" : "bg-white/20 hover:bg-white/30"} text-white`}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>
            </>
          )}

          <button
            onClick={handleEndCall}
            title="End call"
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* ── Minimize ── */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default CallWindow;
