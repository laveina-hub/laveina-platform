import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number; className?: string; color?: string }>;

export function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: IconComponent;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="bg-bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon size={16} className="text-text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text-muted text-xs font-medium">{label}</p>
        <div className="text-text-primary mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-6 w-32 rounded" />
      <div className="border-border-default rounded-xl border bg-white p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1">
                <div className="skeleton-shimmer h-3 w-20 rounded" />
                <div className="skeleton-shimmer h-4 w-40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
