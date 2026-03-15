/**
 * Dashboard top bar — breadcrumb area, search, and user menu.
 */
export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="text-sm text-gray-500">Dashboard</div>

      <div className="flex items-center gap-4">
        <div className="bg-primary-500 h-8 w-8 rounded-full text-center text-sm leading-8 font-semibold text-white">
          U
        </div>
      </div>
    </header>
  );
}
