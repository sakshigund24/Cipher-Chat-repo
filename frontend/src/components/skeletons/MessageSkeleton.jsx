const MessageSkeleton = () => {
  const items = Array(6).fill(null);
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {items.map((_, i) => (
        <div key={i} className={`flex items-end gap-3 ${i % 2 !== 0 ? "flex-row-reverse" : ""}`}>
          <div className="skeleton w-9 h-9 rounded-full shrink-0" />
          <div className={`flex flex-col gap-1 max-w-xs ${i % 2 !== 0 ? "items-end" : ""}`}>
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-14 w-48 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
export default MessageSkeleton;
