import { useEffect, useState } from "react";
import { useChatStore, formatConvTime, buildPreview } from "../store/useChatStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";
import CreateGroupModal from "./modals/CreateGroupModal.jsx";
import CallLogsPage from "../pages/CallLogsPage.jsx";
import SidebarSkeleton from "./skeletons/SidebarSkeleton.jsx";
import { Check, CheckCheck, Users, Hash, Phone, MessageSquare, Plus, Search } from "lucide-react";

// ── Tick for sidebar (last message sent by me) ──────────────
const SidebarTick = ({ status }) => {
  if (status === "seen")
    return <CheckCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "#38bdf8" }} />;
  if (status === "delivered")
    return <CheckCheck className="w-3.5 h-3.5 shrink-0 text-base-content/40" />;
  return <Check className="w-3.5 h-3.5 shrink-0 text-base-content/40" />;
};

const Sidebar = () => {
  const {
    conversations, getConversations, isConvsLoading,
    users, getUsers,
    selectedUser, setSelectedUser,
    markAsSeen, clearUnread,
    subscribeToMessages, unsubscribeFromMessages,
  } = useChatStore();

  const { groups, getMyGroups, selectedGroup, setSelectedGroup } = useGroupStore();
  const { onlineUsers, authUser } = useAuthStore();
  const { getCallHistory } = useCallStore();

  const [activeTab, setActiveTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Load data
  useEffect(() => {
    getConversations();
    getUsers();        // needed for group creation modal
    getMyGroups();
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, []);

  useEffect(() => {
    if (activeTab === "calls") getCallHistory();
  }, [activeTab]);

  // ── Filtered lists ──────────────────────────────────────
  const filteredConvs = conversations.filter((c) =>
    c.user.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "chats",  icon: MessageSquare, label: "Chats" },
    { id: "groups", icon: Hash,          label: "Groups" },
    { id: "calls",  icon: Phone,         label: "Calls" },
  ];

  return (
    <aside className="h-full w-full flex flex-col bg-base-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-3 pt-3 pb-2 border-b border-base-300 space-y-2 shrink-0">
        {/* App name + tabs */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-base hidden lg:block flex-1">Cipher Chat</span>
          <div className="flex gap-1 flex-1 lg:flex-none justify-around lg:justify-start">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`btn btn-xs gap-1 flex-1 lg:flex-none
                  ${activeTab === id ? "btn-primary" : "btn-ghost"}`}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {activeTab !== "calls" && (
          <div className="relative hidden lg:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder={`Search ${activeTab}…`}
              className="input input-sm input-bordered w-full pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {activeTab === "groups" && (
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn btn-sm btn-outline w-full hidden lg:flex gap-2"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">

        {/* CALLS TAB */}
        {activeTab === "calls" && <CallLogsPage />}

        {/* CHATS TAB */}
        {activeTab === "chats" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            {isConvsLoading && conversations.length === 0 ? (
              <SidebarSkeleton />
            ) : filteredConvs.length === 0 ? (
              <p className="text-center text-base-content/40 text-sm py-10 hidden lg:block">
                No conversations yet
              </p>
            ) : (
              filteredConvs.map((conv) => {
                const { user, lastMessage, unreadCount } = conv;
                const isSelected = selectedUser?._id === user._id;
                const isOnline   = onlineUsers.includes(user._id);
                const isMine     = lastMessage?.senderId?.toString() === authUser._id?.toString();
                const preview    = buildPreview(lastMessage);

                return (
                  <button
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedGroup(null);
                      if (unreadCount > 0) markAsSeen(user._id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3
                      hover:bg-base-200 transition-colors border-base-300/30
                      ${isSelected ? "bg-base-200" : ""}`}
                  >
                    {/* Avatar + online dot */}
                    <div className="relative shrink-0">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full ring-2 ring-base-100" />
                      )}
                    </div>

                    {/* Text block — hidden on narrow sidebar */}
                    <div className="hidden lg:flex flex-col flex-1 min-w-0 text-left border-b border-base-300/40 pb-3">
                      {/* Row 1: name + time */}
                      <div className="flex items-start">
                        <span className="font-semibold text-[15px] truncate flex-1">{user.fullName}</span>
                        <span className="ml-2 text-[11px] text-base-content/50 whitespace-nowrap">
                          {formatConvTime(lastMessage?.createdAt)}
                        </span>
                      </div>
                      {/* Row 2: tick + preview + unread badge */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {/* Tick only if I sent the last message */}
                        {isMine && lastMessage && (
                          <SidebarTick status={lastMessage.status} />
                        )}
                        <span
                          className={`text-xs truncate flex-1
                            ${unreadCount > 0 ? "text-base-content font-medium" : "text-base-content/50"}`}
                        >
                          {isMine ? <span className="text-base-content/50">You: </span> : null}
                          {preview}
                        </span>
                        {unreadCount > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full
                            bg-success text-success-content text-[11px] font-bold
                            flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === "groups" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            {/* Mobile new group */}
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-full flex items-center justify-center gap-2 py-3 hover:bg-base-200 lg:hidden border-b border-base-300/50"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">New Group</span>
            </button>

            {filteredGroups.length === 0 ? (
              <p className="text-center text-base-content/40 text-sm py-10 hidden lg:block">
                No groups yet
              </p>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = selectedGroup?._id === group._id;
                return (
                  <button
                    key={group._id}
                    onClick={() => { setSelectedGroup(group); setSelectedUser(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-3
                      hover:bg-base-200 transition-colors border-b border-base-300/30
                      ${isSelected ? "bg-base-200" : ""}`}
                  >
                    <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10
                      flex items-center justify-center overflow-hidden">
                      {group.avatar
                        ? <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                        : <Users className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="hidden lg:flex flex-col items-start min-w-0 flex-1 text-left">
                      <span className="font-semibold text-sm truncate w-full">{group.name}</span>
                      <span className="text-xs text-base-content/50">
                        {group.members?.length || 0} members
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} users={users} />
      )}
    </aside>
  );
};

export default Sidebar;
