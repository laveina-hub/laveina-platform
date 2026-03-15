/**
 * Dashboard sidebar — role-based navigation for admin, pickup point, and customer views.
 */
import { Link } from "@/i18n/navigation";

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="font-display text-primary-500 text-xl font-bold">
          Laveina
        </Link>
      </div>

      <nav className="space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Navigation
        </p>
        <div className="hover:text-primary-500 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50">
          Dashboard
        </div>
        <div className="hover:text-primary-500 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50">
          Shipments
        </div>
        <div className="hover:text-primary-500 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50">
          Settings
        </div>
      </nav>
    </aside>
  );
}
