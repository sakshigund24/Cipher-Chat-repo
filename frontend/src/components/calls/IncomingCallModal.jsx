import { useCallStore } from "../../store/useCallStore.js";
import { Phone, PhoneOff, Video } from "lucide-react";

const IncomingCallModal = () => {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 w-80">
        {/* Pulse ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <img
            src={incomingCall.callerInfo?.profilePic || "/avatar.png"}
            alt={incomingCall.callerInfo?.fullName}
            className="relative w-24 h-24 rounded-full object-cover ring-4 ring-primary/40"
          />
          {/* Call type badge */}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-content rounded-full p-2 shadow-lg">
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold">{incomingCall.callerInfo?.fullName}</h3>
          <p className="text-base-content/60 text-sm mt-1">
            Incoming {isVideo ? "video" : "voice"} call…
          </p>
        </div>

        <div className="flex gap-8">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center shadow-lg hover:bg-error/80 transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-base-content/60">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center shadow-lg hover:bg-success/80 transition-colors"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-xs text-base-content/60">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
