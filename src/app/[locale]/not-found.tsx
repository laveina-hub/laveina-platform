import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-4xl font-bold text-text-primary">404</h1>
      <p className="mt-2 text-text-secondary">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary-500 px-6 py-2 text-white transition-colors hover:bg-primary-600"
      >
        Go Home
      </Link>
    </div>
  );
}
