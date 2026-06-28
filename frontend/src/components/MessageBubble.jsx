import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import {
  Check, CheckCheck, Clock,
  MoreVertical, Reply, Pencil, Trash2, Pin, PinOff,
  FileText, Download,
} from "lucide-react";
import { format } from "date-fns";

// ─── Tick — always visible, correct colour ──────────────────
// On primary (blue) bubble the background IS primary, so sky-400
// is visible. On grey bubble we use a saturated blue instead.
const MessageTick = ({ status }) => {
  if (status === "seen")
    return (
      <CheckCheck
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: "#38bdf8" /* sky-400, readable on any bg */ }}
        title="Seen"
      />
    );
  if (status === "delivered")
    return <CheckCheck className="w-3.5 h-3.5 shrink-0 text-white/50" title="Delivered" />;
  if (status === "sent")
    return <Check className="w-3.5 h-3.5 shrink-0 text-white/50" title="Sent" />;
  return <Clock className="w-3.5 h-3.5 shrink-0 text-white/40" title="Pending" />;
};

const MessageBubble = ({ message, isGroup = false, onEdit }) => {
  const { authUser } = useAuthStore();
  const { setReplyTo, deleteMessage, pinMessage } = useChatStore();

  const senderId = message.senderId?._id || message.senderId;
  const isMine   = senderId === authUser._id;          // TRUE  → right side (me)
  const isDeleted = message.isDeletedForEveryone;
  const senderName = message.senderId?.fullName || "Unknown";
  const senderPic  = message.senderId?.profilePic || "/avatar.png";

  // ── File renderer ───────────────────────────────────────
  const renderFile = () => {
    if (!message.fileUrl && !message.image) return null;

    if (message.fileType === "video") {
      return (
        <video
          src={message.fileUrl}
          controls
          className="max-w-[260px] rounded-xl"
          style={{ maxHeight: 220 }}
        />
      );
    }

    if (message.fileType === "image" || message.image) {
      const src = message.fileUrl || message.image;
      return (
        <img
          src={src}
          alt="attachment"
          className="max-w-[260px] rounded-xl cursor-pointer object-cover"
          style={{ maxHeight: 260 }}
          onClick={() => window.open(src, "_blank")}
        />
      );
    }

    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 p-2 rounded-xl transition-colors
          ${isMine
            ? "bg-white/10 hover:bg-white/20"
            : "bg-base-300 hover:bg-base-300/80"}`}
      >
        <FileText className="w-5 h-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate max-w-[170px]">
            {message.fileName || "File"}
          </p>
          {message.fileSize > 0 && (
            <p className="text-[10px] opacity-60">
              {(message.fileSize / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
        <Download className="w-4 h-4 shrink-0 opacity-60" />
      </a>
    );
  };

  // ── Deleted bubble ──────────────────────────────────────
  if (isDeleted) {
    return (
      <div
        className={`flex items-end gap-2 mb-1
          ${isMine ? "flex-row-reverse" : "flex-row"}`}   // ← KEY: isMine flips row
      >
        {isGroup && !isMine && (
          <img
            src={senderPic}
            alt={senderName}
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />
        )}
        <div className="px-3 py-2 rounded-2xl italic text-sm opacity-50 border border-dashed border-base-content/30">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    /*
      LAYOUT RULE
      isMine  = true  → flex-row-REVERSE → bubble pushed to RIGHT, avatar (if any) on far right
      isMine  = false → flex-row         → bubble on LEFT
    */
    <div
      className={`flex items-end gap-2 group mb-1
        ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar — only in group chats for other people's messages */}
      {isGroup && !isMine && (
        <img
          src={senderPic}
          alt={senderName}
          className="w-7 h-7 rounded-full object-cover shrink-0 self-end"
        />
      )}

      {/* Column that holds sender name + reply + bubble */}
      <div
        className={`relative flex flex-col max-w-[70%] lg:max-w-[55%]
          ${isMine ? "items-end" : "items-start"}`}
      >
        {/* Sender name (group only) */}
        {isGroup && !isMine && (
          <span className="text-[11px] text-primary font-semibold mb-0.5 ml-1">
            {senderName}
          </span>
        )}

        {/* Pinned badge */}
        {message.isPinned && (
          <span className="text-[10px] text-warning flex items-center gap-1 mb-0.5 font-medium">
            <Pin className="w-2.5 h-2.5" /> Pinned
          </span>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div
            className={`mb-1 px-2 py-1 rounded-lg border-l-2 border-primary/70 max-w-full
              ${isMine ? "bg-white/10" : "bg-base-200/80"}`}
          >
            <p className="text-[10px] font-semibold text-primary mb-0.5">
              {(message.replyTo.senderId === authUser._id ||
                message.replyTo.senderId?._id === authUser._id)
                ? "You"
                : senderName}
            </p>
            <p className="text-xs opacity-60 truncate max-w-[180px]">
              {message.replyTo.isDeletedForEveryone
                ? "🚫 Deleted"
                : message.replyTo.text ||
                  (message.replyTo.image || message.replyTo.fileUrl
                    ? "📎 Attachment"
                    : "")}
            </p>
          </div>
        )}

        {/* ── Bubble ── */}
        <div
          className={`relative px-3 py-2 shadow-sm
            ${isMine
              ? "bg-primary text-primary-content rounded-2xl rounded-br-none"
              : "bg-base-200 text-base-content rounded-2xl rounded-bl-none"
            }`}
        >
          {/* File / image */}
          {renderFile()}

          {/* Text */}
          {message.text && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.text}
            </p>
          )}

          {/* ── Meta row: time · edited · TICK ── */}
          <div
            className={`flex items-center gap-1 mt-1
              ${isMine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`text-[10px] leading-none select-none
                ${isMine ? "text-white/60" : "text-base-content/40"}`}
            >
              {format(new Date(message.createdAt), "HH:mm")}
            </span>

            {message.isEdited && (
              <span
                className={`text-[10px] leading-none select-none
                  ${isMine ? "text-white/60" : "text-base-content/40"}`}
              >
                (edited)
              </span>
            )}

            {/* Tick — only on MY messages */}
            {isMine && <MessageTick status={message.status || "sent"} />}
          </div>
        </div>

        {/* ── Context menu ── */}
        <div
          className={`absolute top-0 z-20
            opacity-0 group-hover:opacity-100 transition-opacity
            ${isMine ? "-left-8" : "-right-8"}`}
        >
          <div className={`dropdown ${isMine ? "dropdown-left" : "dropdown-right"}`}>
            <button
              tabIndex={0}
              className="btn btn-ghost btn-xs btn-circle bg-base-100 shadow border border-base-300"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu p-1 shadow-xl bg-base-100 rounded-box w-44 border border-base-300 z-30"
            >
              <li>
                <button
                  onClick={() => setReplyTo(message)}
                  className="text-xs flex gap-2 items-center py-1.5"
                >
                  <Reply className="w-3.5 h-3.5" /> Reply
                </button>
              </li>
              {isMine && (
                <li>
                  <button
                    onClick={() => onEdit && onEdit(message)}
                    className="text-xs flex gap-2 items-center py-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => pinMessage(message._id, !message.isPinned)}
                  className="text-xs flex gap-2 items-center py-1.5"
                >
                  {message.isPinned
                    ? <PinOff className="w-3.5 h-3.5" />
                    : <Pin className="w-3.5 h-3.5" />}
                  {message.isPinned ? "Unpin" : "Pin"}
                </button>
              </li>
              {isMine && (
                <li>
                  <button
                    onClick={() => deleteMessage(message._id, "foreveryone")}
                    className="text-xs flex gap-2 items-center py-1.5 text-error"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete for All
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => deleteMessage(message._id, "forme")}
                  className="text-xs flex gap-2 items-center py-1.5 text-error"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete for Me
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
