/**
 * Calls Page Loading Skeleton
 */
export default function CallsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="h-6 w-32 bg-white/10 rounded" />
          <div className="h-4 w-48 bg-white/5 rounded" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="h-3 w-20 bg-white/10 rounded mb-2" />
            <div className="h-8 w-12 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Call List */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/5 rounded" />
              </div>
              <div className="h-6 w-16 bg-white/10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
