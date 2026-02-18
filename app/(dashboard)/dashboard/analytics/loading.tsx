/**
 * Analytics Page Loading Skeleton
 */
export default function AnalyticsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-32 bg-white/10 rounded" />
        <div className="h-4 w-64 bg-white/5 rounded" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
            <div className="h-10 w-20 bg-white/10 rounded mb-2" />
            <div className="h-3 w-16 bg-white/5 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="h-5 w-32 bg-white/10 rounded mb-4" />
            <div className="h-48 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
