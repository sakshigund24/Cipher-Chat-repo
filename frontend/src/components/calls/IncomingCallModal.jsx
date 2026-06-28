import { useCallStore } from "../../store/useCallStore.js";
import { Phone, PhoneOff, Video } from "lucide-react";

const IncomingCallModal = () => {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 w-80 animate-bounce-in">
        <div className="relative">
          <img
            src={incomingCall.callerInfo?.profilePic || "/avatar.png"}
            alt={incomingCall.callerInfo?.fullName}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-content rounded-full p-2">
            {incomingCall.callType === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold">{incomingCall.callerInfo?.fullName}</h3>
          <p className="text-base-content/60 text-sm mt-1">
            Incoming {incomingCall.callType === "video" ? "video" : "voice"} call…
          </p>
        </div>

        <div className="flex gap-6">
          <button
            onClick={rejectCall}
            className="btn btn-error btn-circle btn-lg shadow-lg"
            title="Decline"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <button
            onClick={acceptCall}
            className="btn btn-success btn-circle btn-lg shadow-lg"
            title="Accept"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
