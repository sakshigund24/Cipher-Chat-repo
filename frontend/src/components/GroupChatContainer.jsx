import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import GroupHeader from "./GroupHeader.jsx";
import { useChatStore } from "../store/useChatStore.js";
import { X } from "lucide-react";

const TypingIndicator = ({ names }) => (
  <div className="flex items-end gap-2 mb-1">
    <div className="px-4 py-2 bg-base-200 rounded-2xl rounded-bl-none">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
    <span className="text-xs text-base-content/40 mb-1">{names.join(", ")} {names.length > 1 ? "are" : "is"} typing…</span>
  </div>
);

const GroupChatContainer = () => {
  const {
    selectedGroup, groupMessages, getGroupMessages, isGroupMessagesLoading,
    subscribeToGroupMessages, unsubscribeFromGroupMessages, typingUsers,
    markGroupMessagesSeen,
  } = useGroupStore();
  const { users } = useChatStore();
  const { authUser } = useAuthStore();
  const bottomRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
      return () => unsubscribeFromGroupMessages();
    }
  }, [selectedGroup?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (selectedGroup) markGroupMessagesSeen(selectedGroup._id);
  }, [groupMessages]);

  const typingNames = Object.keys(typingUsers)
    .filter((id) => id !== authUser._id)
    .map((id) => {
      const member = selectedGroup?.members?.find((m) => (m.userId?._id || m.userId) === id);
      return member?.userId?.fullName || "Someone";
    });

  if (isGroupMessagesLoading) return <MessageSkeleton />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <GroupHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
        {groupMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-base-content/40 text-sm">No messages yet. Start the conversation! 💬</p>
          </div>
        ) : (
          groupMessages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isGroup={true}
              onEdit={(msg) => { setEditingMessage(msg); setEditText(msg.text); }}
            />
          ))
        )}
        {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
        <div ref={bottomRef} />
      </div>

      {editingMessage && (
        <div className="border-t border-base-300 px-4 py-2 bg-base-100 flex gap-2 items-center">
          <span className="text-xs text-base-content/50">Editing</span>
          <input
            className="input input-sm input-bordered flex-1"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                /* handle group message edit via store */
                setEditingMessage(null);
              }
              if (e.key === "Escape") { setEditingMessage(null); setEditText(""); }
            }}
            autoFocus
          />
          <button className="btn btn-sm btn-primary">Save</button>
          <button onClick={() => { setEditingMessage(null); setEditText(""); }} className="btn btn-sm btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <MessageInput isGroup={true} />
    </div>
  );
};

export default GroupChatContainer;
