import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { X, Users, Settings, LogOut } from "lucide-react";
import GroupInfoModal from "./modals/GroupInfoModal.jsx";

const GroupHeader = () => {
  const { selectedGroup, setSelectedGroup, leaveGroup } = useGroupStore();
  const { authUser, onlineUsers } = useAuthStore();
  const [showInfo, setShowInfo] = useState(false);

  if (!selectedGroup) return null;

  const onlineCount = selectedGroup.members?.filter((m) =>
    onlineUsers.includes(m.userId?._id || m.userId)
  ).length || 0;

  const isAdmin = selectedGroup.admins?.some(
    (id) => id.toString() === authUser._id.toString()
  );

  return (
    <>
      <div className="p-3 border-b border-base-300 bg-base-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedGroup(null)}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {selectedGroup.avatar ? (
              <img src={selectedGroup.avatar} alt={selectedGroup.name} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-primary" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm">{selectedGroup.name}</h3>
            <p className="text-xs text-base-content/50">
              {selectedGroup.members?.length || 0} members · {onlineCount} online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowInfo(true)} className="btn btn-ghost btn-xs btn-circle">
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => leaveGroup(selectedGroup._id)}
            className="btn btn-ghost btn-xs btn-circle text-error"
            title="Leave group"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showInfo && <GroupInfoModal onClose={() => setShowInfo(false)} />}
    </>
  );
};

export default GroupHeader;
