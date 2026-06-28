import { useEffect, useRef, useState } from "react";
import { useCallStore } from "../../store/useCallStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { getSocket } from "../../lib/socket.js";
import Peer from "simple-peer";
import {
  PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Minimize2, Maximize2
} from "lucide-react";

const CallWindow = () => {
  const {
    activeCall, endCall, localStream, setLocalStream,
    addRemoteStream, isMuted, isVideoOff, isScreenSharing,
    toggleMute, toggleVideo,
  } = useCallStore();
  const { authUser } = useAuthStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!activeCall || !socket) return;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: activeCall.callType === "video",
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new Peer({
          initiator: activeCall.isInitiator,
          trickle: false,
          stream,
        });

        peer.on("signal", (data) => {
          if (activeCall.isInitiator) {
            socket.emit("callUser", {
              receiverId: activeCall.receiverId,
              callType: activeCall.callType,
              signalData: data,
              callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic },
              roomId: activeCall.roomId,
            });
          } else {
            socket.emit("answerCall", {
              callerId: activeCall.callerId,
              signalData: data,
              roomId: activeCall.roomId,
            });
          }
        });

        peer.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          addRemoteStream(activeCall.receiverId || activeCall.callerId, remoteStream);
          setIsConnected(true);
        });

        peer.on("connect", () => setIsConnected(true));
        peer.on("error", (err) => console.error("Peer error:", err));

        // Listen for answer / offer signal
        const handleCallAccepted = ({ signalData }) => {
          peer.signal(signalData);
        };
        const handleIncomingOffer = ({ signalData }) => {
          if (!activeCall.isInitiator) peer.signal(signalData);
        };

        socket.on("callAccepted", handleCallAccepted);
        socket.on("incomingCall", handleIncomingOffer);

        peerRef.current = peer;

        return () => {
          socket.off("callAccepted", handleCallAccepted);
          socket.off("incomingCall", handleIncomingOffer);
        };
      } catch (err) {
        console.error("Media error:", err);
      }
    };

    startMedia();

    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      peerRef.current?.replaceTrack(
        peerRef.current.streams[0].getVideoTracks()[0],
        cam.getVideoTracks()[0],
        peerRef.current.streams[0]
      );
      useCallStore.setState({ isScreenSharing: false });
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        peerRef.current?.replaceTrack(
          peerRef.current.streams[0].getVideoTracks()[0],
          screen.getVideoTracks()[0],
          peerRef.current.streams[0]
        );
        useCallStore.setState({ isScreenSharing: true });
        screen.getVideoTracks()[0].onended = () => handleScreenShare();
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  };

  const handleEndCall = () => {
    peerRef.current?.destroy();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    endCall();
  };

  const peerInfo = activeCall?.peerInfo || activeCall?.callerInfo;

  return (
    <div
      className={`fixed z-[90] bg-base-300 rounded-2xl shadow-2xl overflow-hidden transition-all
        ${isMinimized ? "bottom-4 right-4 w-72 h-48" : "inset-4 md:inset-8"}`}
    >
      {/* Remote video */}
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        {activeCall?.callType === "video" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <img
              src={peerInfo?.profilePic || "/avatar.png"}
              alt=""
              className="w-28 h-28 rounded-full object-cover"
            />
            <p className="text-white font-semibold text-lg">{peerInfo?.fullName}</p>
            <p className="text-white/60 text-sm animate-pulse">
              {isConnected ? formatDuration(callDuration) : "Connecting…"}
            </p>
          </div>
        )}

        {/* Local video (PiP) */}
        {activeCall?.callType === "video" && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-4 right-4 w-28 h-20 rounded-xl object-cover border-2 border-white/20 shadow-lg"
          />
        )}

        {/* Duration */}
        {activeCall?.callType === "video" && isConnected && (
          <div className="absolute top-4 left-4 bg-black/50 rounded-full px-3 py-1">
            <span className="text-white text-xs">{formatDuration(callDuration)}</span>
          </div>
        )}

        {/* Name banner */}
        {activeCall?.callType === "video" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-4 py-1">
            <span className="text-white text-sm font-medium">{peerInfo?.fullName}</span>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            onClick={toggleMute}
            className={`btn btn-circle shadow-lg ${isMuted ? "btn-error" : "btn-neutral/80 backdrop-blur"}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {activeCall?.callType === "video" && (
            <>
              <button
                onClick={toggleVideo}
                className={`btn btn-circle shadow-lg ${isVideoOff ? "btn-error" : "btn-neutral/80 backdrop-blur"}`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <button
                onClick={handleScreenShare}
                className={`btn btn-circle shadow-lg ${isScreenSharing ? "btn-warning" : "btn-neutral/80 backdrop-blur"}`}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>
            </>
          )}

          <button onClick={handleEndCall} className="btn btn-error btn-circle btn-lg shadow-lg">
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Minimize */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute top-4 right-4 btn btn-ghost btn-xs btn-circle text-white"
        >
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default CallWindow;
