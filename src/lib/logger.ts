/**
 * Structured JSON logger.
 *
 * One JSON object per line, written to stdout/stderr. Vercel's log drains and
 * any log destination (Axiom, BetterStack, Datadog) parse this natively, so
 * fields like `shipment_id`, `event_id`, `request_id` become queryable without
 * a third-party APM SDK.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("scan accepted", { shipment_id: id, status });
 *   logger.error("stripe webhook failed", { event_id: eventId }, err);
 *
 * Always emits valid JSON: circular refs become "[unserializable]" rather
 * than throwing. Errors are unwrapped to {message, stack, code} for log
 * aggregator-friendly fields. The `module` field can be set via child()
 * for cross-call correlation without repeating context.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// LOG_LEVEL=debug|info|warn|error (default: info; debug in dev)
const minLevel: LogLevel = (() => {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
})();

function unwrapError(err: unknown): LogContext {
  if (err instanceof Error) {
    const out: LogContext = { name: err.name, message: err.message };
    if (err.stack) out.stack = err.stack;
    if ("code" in err && typeof err.code === "string") out.code = err.code;
    return { error: out };
  }
  if (typeof err === "object" && err !== null) {
    return { error: err };
  }
  if (err !== undefined) {
    return { error: String(err) };
  }
  return {};
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[circular]";
        seen.add(val);
      }
      if (typeof val === "bigint") return val.toString();
      return val;
    });
  } catch {
    return '{"msg":"[unserializable log entry]"}';
  }
}

function emit(level: LogLevel, msg: string, context?: LogContext, err?: unknown): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const entry: LogContext = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...context,
    ...unwrapError(err),
  };

  const line = safeStringify(entry);

  // Route warn/error to stderr so log destinations can split streams.
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext, err?: unknown): void;
  error(msg: string, context?: LogContext, err?: unknown): void;
  /** Returns a logger that injects `bound` into every entry. */
  child(bound: LogContext): Logger;
}

function buildLogger(bound: LogContext = {}): Logger {
  const merge = (ctx?: LogContext): LogContext | undefined => {
    if (!ctx) return Object.keys(bound).length > 0 ? bound : undefined;
    return { ...bound, ...ctx };
  };

  return {
    debug: (msg, context) => emit("debug", msg, merge(context)),
    info: (msg, context) => emit("info", msg, merge(context)),
    warn: (msg, context, err) => emit("warn", msg, merge(context), err),
    error: (msg, context, err) => emit("error", msg, merge(context), err),
    child: (next) => buildLogger({ ...bound, ...next }),
  };
}

export const logger: Logger = buildLogger();
