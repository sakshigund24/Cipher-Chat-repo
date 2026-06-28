import { useEffect } from "react";
import { useCallStore } from "../store/useCallStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { getSocket } from "../lib/socket.js";
import {
  Phone, Video, PhoneIncoming, PhoneMissed, PhoneOutgoing,
  PhoneOff, Clock, Loader
} from "lucide-react";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { useCallStore as useCS } from "../store/useCallStore.js";

const formatDuration = (seconds) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const CallIcon = ({ call, isMe }) => {
  const isMissed = call.status === "missed";
  const isDeclined = call.status === "declined";

  if (isMissed || isDeclined)
    return <PhoneMissed className="w-4 h-4 text-error" />;
  if (isMe)
    return <PhoneOutgoing className="w-4 h-4 text-success" />;
  return <PhoneIncoming className="w-4 h-4 text-info" />;
};

const CallLogsPage = () => {
  const { callHistory, isCallHistoryLoading, getCallHistory, setActiveCall } = useCallStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    getCallHistory();
  }, []);

  const startCall = (user, callType) => {
    const socket = getSocket();
    const roomId = uuidv4();
    socket?.emit("callUser", {
      receiverId: user._id,
      callType,
      callerInfo: { fullName: authUser.fullName, profilePic: authUser.profilePic },
      roomId,
    });
    setActiveCall({
      receiverId: user._id,
      peerInfo: user,
      callType,
      roomId,
      isInitiator: true,
    });
  };

  if (isCallHistoryLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (callHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Phone className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">No Call History</h3>
          <p className="text-base-content/50 text-sm mt-1">
            Your call history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-base-300">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" /> Call Logs
        </h2>
        <p className="text-xs text-base-content/50 mt-0.5">{callHistory.length} calls</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {callHistory.map((call) => {
          const isMe = call.callerId?._id === authUser._id || call.callerId === authUser._id;
          const peer = isMe ? call.receiverId : call.callerId;
          const isMissed = call.status === "missed";
          const isDeclined = call.status === "declined";
          const isEnded = call.status === "ended";

          return (
            <div
              key={call._id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-300/40"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={peer?.profilePic || "/avatar.png"}
                  alt={peer?.fullName || "Unknown"}
                  className="w-11 h-11 rounded-full object-cover"
                />
                {/* Call type badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-base-100 flex items-center justify-center shadow-sm">
                  {call.callType === "video"
                    ? <Video className="w-3 h-3 text-primary" />
                    : <Phone className="w-3 h-3 text-primary" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-medium text-sm truncate ${(isMissed || isDeclined) && !isMe ? "text-error" : ""}`}>
                    {peer?.fullName || "Unknown"}
                  </p>
                  <CallIcon call={call} isMe={isMe} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-base-content/50">
                    {call.createdAt
                      ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })
                      : "—"}
                  </span>
                  {isEnded && call.duration > 0 && (
                    <>
                      <span className="text-base-content/30">·</span>
                      <span className="text-xs text-base-content/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDuration(call.duration)}
                      </span>
                    </>
                  )}
                  {(isMissed || isDeclined) && (
                    <span className="badge badge-error badge-xs">
                      {isDeclined ? "Declined" : "Missed"}
                    </span>
                  )}
                  {call.status === "ongoing" && (
                    <span className="badge badge-success badge-xs animate-pulse">Ongoing</span>
                  )}
                </div>
              </div>

              {/* Call back buttons */}
              {peer && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startCall(peer, "voice")}
                    className="btn btn-ghost btn-xs btn-circle text-success"
                    title="Voice call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startCall(peer, "video")}
                    className="btn btn-ghost btn-xs btn-circle text-primary"
                    title="Video call"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CallLogsPage;
