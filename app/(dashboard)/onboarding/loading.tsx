/**
 * Onboarding Page Loading Skeleton
 */
export default function OnboardingLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl animate-pulse">
        {/* Progress bar skeleton */}
        <div className="mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Form card skeleton */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="h-8 w-64 bg-white/10 rounded mx-auto" />
              <div className="h-4 w-48 bg-white/5 rounded mx-auto" />
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded" />
                  <div className="h-12 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Button */}
            <div className="h-12 bg-white/10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
