import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
// import { useCallStore } from "../store/useCallStore.js";
// import { getSocket } from "../lib/socket.js";
// import { axiosInstance } from "../lib/axios.js";
import { X, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
// import { v4 as uuidv4 } from "uuid";

const ChatHeader = ({ onSearchClick }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  // const { setActiveCall } = useCallStore();

  const isOnline = onlineUsers.includes(selectedUser?._id);

  // const startCall = async (callType) => {
  //   const socket = getSocket();
  //   const roomId = uuidv4();

  //   // Set active call immediately so CallWindow mounts and starts media
  //   setActiveCall({
  //     receiverId: selectedUser._id,
  //     peerInfo: {
  //       _id: selectedUser._id,
  //       fullName: selectedUser.fullName,
  //       profilePic: selectedUser.profilePic,
  //     },
  //     callType,
  //     roomId,
  //     isInitiator: true,
  //   });

  //   // Log the outgoing call to DB
  //   // (status will be updated to "ended" by CallWindow when call finishes)
  //   try {
  //     await axiosInstance.post("/calls", {
  //       receiverId: selectedUser._id,
  //       callType,
  //       callMode: "direct",
  //       status: "ringing",
  //     });
  //   } catch {}
  // };

  if (!selectedUser) return null;

  return (
    <div className="p-3 border-b border-base-300 bg-base-100 flex items-center justify-between">
      {/* Left: back + avatar + name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-xs btn-circle"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          <img
            src={selectedUser.profilePic || "/avatar.png"}
            alt={selectedUser.fullName}
            className="w-10 h-10 rounded-full object-cover"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-base-100" />
          )}
        </div>

        <div>
          <h3 className="font-semibold text-sm leading-tight">{selectedUser.fullName}</h3>
          <p className="text-xs text-base-content/50">
            {isOnline
              ? "🟢 Online"
              : selectedUser.lastSeen
              ? `Last seen ${formatDistanceToNow(new Date(selectedUser.lastSeen), { addSuffix: true })}`
              : "Offline"}
          </p>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="btn btn-ghost btn-xs btn-circle"
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
        {/* <button
          onClick={() => startCall("voice")}
          className="btn btn-ghost btn-xs btn-circle"
          title="Voice call"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          onClick={() => startCall("video")}
          className="btn btn-ghost btn-xs btn-circle"
          title="Video call"
        >
          <Video className="w-4 h-4" />
        </button> */}
      </div>
    </div>
  );
};

export default ChatHeader;
