import { promises as fs } from "node:fs";
import path from "node:path";

// Persistent per-request log for SendCloud v3 traffic. Writes a human-readable
// entry (one request OR response per entry) to `logs/sendcloud-YYYY-MM-DD.log`
// so the full JSON body is available even when the dev-terminal buffer clips.
//
// Fire-and-forget by design: log-file failures must never break a live API
// call. The console still has the same payload via `client.ts`.
//
// The `logs/` directory is gitignored.

const LOG_DIR = path.join(process.cwd(), "logs");

let ensured = false;

async function ensureLogDir(): Promise<void> {
  if (ensured) return;
  await fs.mkdir(LOG_DIR, { recursive: true });
  ensured = true;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatBody(body: unknown): string {
  if (body === undefined || body === null) return "(none)";
  if (typeof body === "string") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

export type SendcloudLogEntry =
  | { direction: "request"; method: string; path: string; body?: unknown }
  | {
      direction: "response";
      method: string;
      path: string;
      status: number;
      ok: boolean;
      body?: unknown;
    };

const SEP = "─".repeat(72);

export async function appendSendcloudLog(entry: SendcloudLogEntry): Promise<void> {
  try {
    await ensureLogDir();
    const file = path.join(LOG_DIR, `sendcloud-${todayStamp()}.log`);
    const ts = new Date().toISOString();

    const header =
      entry.direction === "request"
        ? `${ts}  → ${entry.method} ${entry.path}`
        : `${ts}  ← ${entry.status}${entry.ok ? "" : " (error)"} ${entry.method} ${entry.path}`;

    const bodyLabel = entry.direction === "request" ? "request body:" : "response body:";
    const line = `${SEP}\n${header}\n${bodyLabel}\n${formatBody(entry.body)}\n`;

    await fs.appendFile(file, line, "utf-8");
  } catch (err) {
    console.warn(
      `[sendcloud] log-file append failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
