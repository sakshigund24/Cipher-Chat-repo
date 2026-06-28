import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import ChatHeader from "./ChatHeader.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageBubble from "./MessageBubble.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import { Search, X, Pin } from "lucide-react";

const TypingIndicator = ({ name }) => (
  <div className="flex items-end gap-2 mb-1">
    <div className="px-4 py-2 bg-base-200 rounded-2xl rounded-bl-none">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
    <span className="text-xs text-base-content/40 mb-1">{name} is typing…</span>
  </div>
);

const ChatContainer = () => {
  const {
    messages, getMessages, isMessagesLoading, selectedUser,
    subscribeToMessages, unsubscribeFromMessages,
    typingUsers, markAsSeen, editMessage,
    searchMessages, searchResults, clearSearch, isSearching,
    pinnedMessages, getPinnedMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();

  const bottomRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const { wallpaper } = useChatStore();

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      getPinnedMessages(selectedUser._id);
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (selectedUser && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if ((lastMsg.senderId?._id || lastMsg.senderId) !== authUser._id) {
        markAsSeen(lastMsg.senderId?._id || lastMsg.senderId);
      }
    }
  }, [messages]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      searchMessages(searchQuery, selectedUser._id);
    }
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    await editMessage(editingMessage._id, editText);
    setEditingMessage(null);
    setEditText("");
  };

  const isTyping = selectedUser && Object.keys(typingUsers).includes(selectedUser._id);

  if (isMessagesLoading) return <MessageSkeleton />;

  const displayMessages = searchResults ? searchResults : messages;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatHeader
        onInfoClick={() => {}}
        onSearchClick={() => setShowSearch(!showSearch)}
      />

      {/* Search bar */}
      {showSearch && (
        <div className="border-b border-base-300 px-4 py-2 bg-base-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="input input-sm input-bordered flex-1"
              autoFocus
            />
            <button type="submit" className="btn btn-sm btn-primary">
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setShowSearch(false); clearSearch(); setSearchQuery(""); }}
              className="btn btn-sm btn-ghost"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
          {searchResults && (
            <p className="text-xs text-base-content/50 mt-1">{searchResults.length} results</p>
          )}
        </div>
      )}

      {/* Pinned messages bar */}
      {pinnedMessages.length > 0 && (
        <button
          onClick={() => setShowPinned(!showPinned)}
          className="flex items-center gap-2 px-4 py-2 border-b border-base-300 bg-warning/10 hover:bg-warning/20 transition-colors text-left w-full"
        >
          <Pin className="w-4 h-4 text-warning shrink-0" />
          <span className="text-xs text-base-content/70 truncate">
            {pinnedMessages[0]?.text || "📎 Attachment"} · {pinnedMessages.length} pinned
          </span>
        </button>
      )}

      {/* Pinned messages panel */}
      {showPinned && (
        <div className="border-b border-base-300 bg-base-200 max-h-40 overflow-y-auto">
          {pinnedMessages.map((m) => (
            <div key={m._id} className="px-4 py-2 text-sm border-b border-base-300/50 last:border-0">
              <span className="text-xs text-primary font-semibold">{m.senderId?.fullName}: </span>
              {m.text || "📎 Attachment"}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin"
        style={wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover" } : {}}
      >
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-base-content/40 text-sm">
              {searchResults ? "No messages found" : "No messages yet. Say hi! 👋"}
            </p>
          </div>
        ) : (
          displayMessages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              onEdit={(msg) => { setEditingMessage(msg); setEditText(msg.text); }}
            />
          ))
        )}

        {isTyping && selectedUser && (
          <TypingIndicator name={selectedUser.fullName} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Edit mode */}
      {editingMessage && (
        <div className="border-t border-base-300 px-4 py-2 bg-base-100 flex gap-2 items-center">
          <span className="text-xs text-base-content/50">Editing message</span>
          <input
            className="input input-sm input-bordered flex-1"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSave();
              if (e.key === "Escape") { setEditingMessage(null); setEditText(""); }
            }}
            autoFocus
          />
          <button onClick={handleEditSave} className="btn btn-sm btn-primary">Save</button>
          <button onClick={() => { setEditingMessage(null); setEditText(""); }} className="btn btn-sm btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
