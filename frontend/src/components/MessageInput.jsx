import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useChatStore } from "../store/useChatStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { getSocket } from "../lib/socket.js";
import toast from "react-hot-toast";
import {
  Send, Paperclip, Image, X, Smile, FileText
} from "lucide-react";

const MessageInput = ({ isGroup = false }) => {
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const typingTimeoutRef = useRef(null);

  const { sendMessage, replyTo, clearReplyTo, uploadFile: uploadFileFn, editMessage } = useChatStore();
  const { sendGroupMessage } = useGroupStore();
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();

  const emitTyping = (typing) => {
    const socket = getSocket();
    if (!socket) return;
    if (isGroup && selectedGroup) {
      socket.emit(typing ? "typing" : "stopTyping", { groupId: selectedGroup._id });
    } else if (!isGroup && selectedUser) {
      socket.emit(typing ? "typing" : "stopTyping", { receiverId: selectedUser._id });
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview({ url: reader.result, type: "image", name: file.name });
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: "file", name: file.name, size: file.size });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxSize: 50 * 1024 * 1024,
  });

  const clearFile = () => { setFilePreview(null); setPendingFile(null); };

  const handleSend = async () => {
    if (!text.trim() && !pendingFile) return;
    setIsSending(true);
    emitTyping(false);

    try {
      let fileData = {};
      if (pendingFile) {
        setIsUploading(true);
        const uploaded = await uploadFileFn(pendingFile);
        setIsUploading(false);
        fileData = {
          fileUrl: uploaded.url,
          fileName: uploaded.fileName,
          fileType: uploaded.fileType,
          fileSize: uploaded.fileSize,
          image: uploaded.fileType === "image" ? uploaded.url : "",
        };
      }

      const payload = {
        text: text.trim(),
        replyTo: replyTo?._id,
        ...fileData,
      };

      if (isGroup && selectedGroup) {
        await sendGroupMessage(selectedGroup._id, payload);
      } else if (selectedUser) {
        await sendMessage(payload);
      }

      setText("");
      clearFile();
      clearReplyTo();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div {...getRootProps()} className={`p-3 border-t border-base-300 bg-base-100
      ${isDragActive ? "ring-2 ring-primary ring-inset" : ""}`}>
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center z-10 rounded-xl">
          <p className="text-primary font-semibold text-lg">Drop file to send</p>
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-base-200 rounded-xl">
          <div className="flex-1 border-l-2 border-primary pl-2">
            <p className="text-xs font-semibold text-primary">Replying to</p>
            <p className="text-xs text-base-content/60 truncate">
              {replyTo.isDeletedForEveryone ? "🚫 Deleted" : replyTo.text || "📎 Attachment"}
            </p>
          </div>
          <button onClick={clearReplyTo} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* File Preview */}
      {filePreview && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-base-200 rounded-xl">
          {filePreview.type === "image" ? (
            <img src={filePreview.url} alt="preview" className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-base-300 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{filePreview.name}</p>
            {filePreview.size && (
              <p className="text-xs text-base-content/50">{(filePreview.size / 1024).toFixed(1)} KB</p>
            )}
          </div>
          <button onClick={clearFile} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={open}
          className="btn btn-ghost btn-sm btn-circle shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 textarea textarea-bordered textarea-sm resize-none min-h-[40px] max-h-32 leading-relaxed"
          style={{ height: "auto", overflowY: text.split("\n").length > 3 ? "scroll" : "hidden" }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !pendingFile) || isSending}
          className="btn btn-primary btn-sm btn-circle shrink-0"
        >
          {isSending || isUploading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
