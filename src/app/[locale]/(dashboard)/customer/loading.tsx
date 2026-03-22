export default function CustomerLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="animate-pulse">
        <div className="mb-6 h-6 w-40 rounded bg-gray-200" />
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 flex-1 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
