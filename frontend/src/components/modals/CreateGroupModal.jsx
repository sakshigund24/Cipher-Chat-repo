import { useState } from "react";
import { useGroupStore } from "../../store/useGroupStore.js";
import { X, Users, Camera } from "lucide-react";

const CreateGroupModal = ({ onClose, users }) => {
  const { createGroup } = useGroupStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    const result = await createGroup({ name, description, memberIds: selectedMembers, avatar });
    setIsCreating(false);
    if (result) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-300">
          <h2 className="text-lg font-bold">Create Group</h2>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center overflow-hidden ring-2 ring-base-300 group-hover:ring-primary transition-all">
                {avatar ? (
                  <img src={avatar} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8 text-base-content/40" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-content rounded-full p-1.5">
                <Camera className="w-3 h-3" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          {/* Name */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Group Name *</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name..."
              className="input input-bordered"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Description</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Group description (optional)"
              className="textarea textarea-bordered resize-none"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Members */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Add Members</span>
              <span className="label-text-alt">{selectedMembers.length} selected</span>
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user._id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium">{user.fullName}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-base-300 flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="btn btn-primary flex-1"
          >
            {isCreating ? <span className="loading loading-spinner loading-sm" /> : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
