import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import Sidebar from "../components/Sidebar.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import GroupChatContainer from "../components/GroupChatContainer.jsx";
import { MessageSquare } from "lucide-react";

const MIN_SIDEBAR_W = 320;   // px — narrowest allowed
const MAX_SIDEBAR_W = 520;   // px — widest allowed
const DEFAULT_W     = 320;   // px — initial width

const NoChatSelected = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center select-none">
    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
      <MessageSquare className="w-10 h-10 text-primary" />
    </div>
    <div>
      <h2 className="text-2xl font-bold">Welcome to Cipher Chat</h2>
      <p className="text-base-content/50 mt-2">
        Select a conversation or group to start messaging
      </p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {["End-to-End Encrypted", "Real-time Messaging", "File Sharing"].map((f) => (
        <span key={f} className="badge badge-outline badge-primary text-xs">{f}</span>
      ))}
    </div>
  </div>
);

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const hasSelection = selectedUser || selectedGroup;

  // ── Resizable sidebar state ───────────────────────────
  const [sidebarW, setSidebarW] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? Number(saved) : DEFAULT_W;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(0);
  const containerRef = useRef(null);

  // Persist width to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-width", String(sidebarW));
  }, [sidebarW]);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarW;
    setIsDragging(true);
  }, [sidebarW]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      const delta = e.clientX - dragStartX.current;
      const next  = Math.min(MAX_SIDEBAR_W, Math.max(MIN_SIDEBAR_W, dragStartW.current + delta));
      setSidebarW(next);
    };

    const onMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [isDragging]);

  // Touch support for mobile
  const onTouchStart = useCallback((e) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartW.current = sidebarW;
    setIsDragging(true);
  }, [sidebarW]);

  useEffect(() => {
    if (!isDragging) return;

    const onTouchMove = (e) => {
      const delta = e.touches[0].clientX - dragStartX.current;
      const next  = Math.min(MAX_SIDEBAR_W, Math.max(MIN_SIDEBAR_W, dragStartW.current + delta));
      setSidebarW(next);
    };
    const onTouchEnd = () => setIsDragging(false);

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend",  onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="flex h-screen pt-14 bg-base-100 overflow-hidden"
      style={{ userSelect: isDragging ? "none" : "auto" }}
    >
      {/* ── Sidebar (resizable) ───────────────────────── */}
      <div
        className={`h-full flex-shrink-0 ${hasSelection ? "hidden md:flex" : "flex"}`}
        style={{ width: sidebarW }}
      >
        <Sidebar />
      </div>

      {/* ── Drag handle ──────────────────────────────── */}
      <div
        className={`
          hidden md:flex
          relative z-30 flex-shrink-0
          w-1 hover:w-1.5
          cursor-col-resize
          group
          transition-all duration-150
          ${isDragging ? "w-1.5" : ""}
        `}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        title="Drag to resize"
      >
        {/* Visual line */}
        <div
          className={`
            absolute inset-y-0 left-0 w-full
            bg-base-300
            group-hover:bg-primary
            transition-colors duration-150
            ${isDragging ? "bg-primary" : ""}
          `}
        />

        {/* Centre grip dots */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-0.5 h-0.5 rounded-full transition-colors duration-150
                ${isDragging ? "bg-primary-content" : "bg-base-content/30 group-hover:bg-primary-content"}`}
            />
          ))}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col overflow-hidden min-w-0
          ${!hasSelection ? "hidden md:flex" : "flex"}`}
      >
        {selectedUser ? (
          <ChatContainer />
        ) : selectedGroup ? (
          <GroupChatContainer />
        ) : (
          <NoChatSelected />
        )}
      </div>

      {/* Global dragging cursor overlay so cursor stays col-resize even if mouse leaves handle */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
};

export default HomePage;
