/**
 * Public site footer — branding, links, and copyright.
 */
export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-display text-lg font-bold text-primary-500">
            Laveina
          </p>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Laveina. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
