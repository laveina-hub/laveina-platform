import type { LucideIcon } from "lucide-react";

export function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon size={16} className="text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="mt-0.5 text-sm text-gray-900">{children}</div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}
