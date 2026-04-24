"use client";

// Last-resort fallback when the root layout itself throws — next-intl hasn't
// initialised at this point, so copy is hardcoded in the default locale (es).
// Any locale-aware error handling happens in src/app/[locale]/error.tsx.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1a1a1a",
          background: "#fafafa",
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>Algo ha ido mal</h1>
        <p style={{ marginTop: "0.75rem", color: "#555", maxWidth: "32rem", textAlign: "center" }}>
          Ha ocurrido un error inesperado. Inténtalo de nuevo en unos instantes.
        </p>
        {error.digest ? (
          <p style={{ marginTop: "0.5rem", color: "#888", fontSize: "0.85rem" }}>
            Ref: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.65rem 1.25rem",
            background: "#000",
            color: "#fff",
            border: 0,
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
