"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-4xl font-bold text-error-500">Something went wrong</h1>
      <p className="mt-2 text-text-secondary">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary-500 px-6 py-2 text-white transition-colors hover:bg-primary-600"
      >
        Try again
      </button>
    </div>
  );
}
