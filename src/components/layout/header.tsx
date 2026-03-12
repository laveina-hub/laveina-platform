/**
 * Public site header — logo, navigation links, and locale/auth controls.
 */
import { Link } from "@/i18n/navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-bold text-primary-500">
          Laveina
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/pricing" className="transition hover:text-primary-500">
            Pricing
          </Link>
          <Link href="/pickup-points" className="transition hover:text-primary-500">
            Pickup Points
          </Link>
          <Link href="/book" className="rounded-lg bg-primary-500 px-4 py-2 text-white transition hover:bg-primary-600">
            Book Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
