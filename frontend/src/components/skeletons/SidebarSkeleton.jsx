const SidebarSkeleton = () => (
  <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col">
    <div className="border-b border-base-300 p-5">
      <div className="skeleton h-6 w-24" />
    </div>
    <div className="overflow-y-auto flex-1 py-3">
      {Array(8).fill(null).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="skeleton w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 hidden lg:flex lg:flex-col">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-2 w-20" />
          </div>
        </div>
      ))}
    </div>
  </aside>
);
export default SidebarSkeleton;
