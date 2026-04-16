export default function PickupPointLoading() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer border-border-default h-24 rounded-xl border bg-white"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="border-border-default rounded-xl border bg-white">
        <div className="divide-border-muted divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
