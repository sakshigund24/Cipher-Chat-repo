import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { Camera, Loader, Github, Linkedin, Twitter, User, Mail } from "lucide-react";

const ProfilePage = () => {
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    customStatus: authUser?.customStatus || "",
    socialLinks: {
      github: authUser?.socialLinks?.github || "",
      linkedin: authUser?.socialLinks?.linkedin || "",
      twitter: authUser?.socialLinks?.twitter || "",
    },
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const fileRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfile({ ...formData, profilePic: selectedImage || undefined });
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-base-200">
      <div className="max-w-xl mx-auto px-4 space-y-6">
        <div className="bg-base-100 rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold mb-6">My Profile</h1>

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <img
                src={selectedImage || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-base-300"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium flex items-center gap-2"><User className="w-4 h-4" /> Full Name</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span></label>
              <input type="email" className="input input-bordered" value={authUser?.email} disabled />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Bio</span></label>
              <textarea
                className="textarea textarea-bordered resize-none"
                rows={3}
                placeholder="Tell people about yourself..."
                maxLength={200}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
              <label className="label"><span className="label-text-alt text-base-content/40">{formData.bio.length}/200</span></label>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Custom Status</span></label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="What's on your mind?"
                maxLength={100}
                value={formData.customStatus}
                onChange={(e) => setFormData({ ...formData, customStatus: e.target.value })}
              />
            </div>

            <div className="divider text-sm">Social Links</div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</span></label>
              <input
                type="url"
                className="input input-bordered"
                placeholder="https://github.com/username"
                value={formData.socialLinks.github}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, github: e.target.value } })}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</span></label>
              <input
                type="url"
                className="input input-bordered"
                placeholder="https://linkedin.com/in/username"
                value={formData.socialLinks.linkedin}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: e.target.value } })}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter / X</span></label>
              <input
                type="url"
                className="input input-bordered"
                placeholder="https://twitter.com/username"
                value={formData.socialLinks.twitter}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, twitter: e.target.value } })}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isUpdatingProfile}
              className="btn btn-primary w-full mt-2"
            >
              {isUpdatingProfile ? <Loader className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-base-100 rounded-2xl shadow-lg p-6 space-y-3">
          <h2 className="font-bold">Account Information</h2>
          <div className="flex justify-between text-sm">
            <span className="text-base-content/60">Member since</span>
            <span className="font-medium">{authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-base-content/60">Encryption</span>
            <span className="badge badge-success badge-sm">E2E Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
