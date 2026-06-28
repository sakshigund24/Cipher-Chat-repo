import { useState } from "react";
import { useGroupStore } from "../../store/useGroupStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import { useChatStore } from "../../store/useChatStore.js";
import {
  X, Camera, Shield, UserMinus, UserPlus, Trash2, Users, Check
} from "lucide-react";

const GroupInfoModal = ({ onClose }) => {
  const { selectedGroup, updateGroup, addMembers, removeMember, makeAdmin, deleteGroup } = useGroupStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { users } = useChatStore();
  const [tab, setTab] = useState("info");
  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [avatar, setAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addingMembers, setAddingMembers] = useState([]);

  const isAdmin = selectedGroup?.admins?.some(
    (id) => id.toString() === authUser._id.toString()
  );

  const groupMemberIds = selectedGroup?.members?.map((m) =>
    (m.userId?._id || m.userId).toString()
  ) || [];

  const nonMembers = users.filter((u) => !groupMemberIds.includes(u._id.toString()));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateGroup(selectedGroup._id, { name, description, avatar: avatar || undefined });
    setIsSaving(false);
  };

  const handleAddMembers = async () => {
    if (!addingMembers.length) return;
    await addMembers(selectedGroup._id, addingMembers);
    setAddingMembers([]);
  };

  const toggleAddMember = (id) =>
    setAddingMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300">
          <h2 className="text-lg font-bold">Group Info</h2>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-300">
          {["info", "members", "add"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors
                ${tab === t ? "border-b-2 border-primary text-primary" : "text-base-content/60"}`}
            >
              {t === "add" ? "Add Members" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Info Tab */}
          {tab === "info" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <label className={`relative ${isAdmin ? "cursor-pointer" : ""} group`}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-base-200 ring-2 ring-base-300">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : selectedGroup?.avatar ? (
                      <img src={selectedGroup.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-10 h-10 text-base-content/30" />
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </>
                  )}
                </label>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Group Name</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered"
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Description</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered resize-none"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              {isAdmin && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary w-full"
                >
                  {isSaving ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => { deleteGroup(selectedGroup._id); onClose(); }}
                  className="btn btn-error btn-outline w-full"
                >
                  <Trash2 className="w-4 h-4" /> Delete Group
                </button>
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === "members" && (
            <div className="space-y-2">
              {selectedGroup?.members?.map((member) => {
                const u = member.userId;
                const uid = (u?._id || u)?.toString();
                const isOnline = onlineUsers.includes(uid);
                const isMemberAdmin = selectedGroup.admins?.some(
                  (id) => id.toString() === uid
                );
                const isMe = uid === authUser._id.toString();

                return (
                  <div key={uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200">
                    <div className="relative shrink-0">
                      <img
                        src={u?.profilePic || "/avatar.png"}
                        alt={u?.fullName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-success rounded-full ring-1 ring-base-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u?.fullName} {isMe && "(you)"}
                      </p>
                      {isMemberAdmin && (
                        <span className="text-xs text-warning flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    {isAdmin && !isMe && (
                      <div className="flex gap-1">
                        {!isMemberAdmin && (
                          <button
                            onClick={() => makeAdmin(selectedGroup._id, uid)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="Make admin"
                          >
                            <Shield className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeMember(selectedGroup._id, uid)}
                          className="btn btn-ghost btn-xs btn-circle text-error"
                          title="Remove"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Members Tab */}
          {tab === "add" && isAdmin && (
            <div className="space-y-3">
              {nonMembers.length === 0 ? (
                <p className="text-center text-base-content/40 text-sm py-8">All users are already members</p>
              ) : (
                <>
                  {nonMembers.map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={addingMembers.includes(user._id)}
                        onChange={() => toggleAddMember(user._id)}
                      />
                      <img src={user.profilePic || "/avatar.png"} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm">{user.fullName}</span>
                    </label>
                  ))}
                  <button
                    onClick={handleAddMembers}
                    disabled={!addingMembers.length}
                    className="btn btn-primary w-full"
                  >
                    <UserPlus className="w-4 h-4" /> Add {addingMembers.length || ""} Members
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "add" && !isAdmin && (
            <p className="text-center text-base-content/40 text-sm py-8">Only admins can add members</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
