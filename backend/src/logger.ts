// Minimal structured logger — zero dependencies.
// LOG_FORMAT=json → one JSON object per line (for log aggregators).
// Otherwise → human-readable "[time] LEVEL message {meta}".
// LOG_LEVEL=debug|info|warn|error (default info).

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return LEVEL_ORDER[env] ?? LEVEL_ORDER.info;
}

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < minLevel()) return;
  const ts = new Date().toISOString();
  if (process.env.LOG_FORMAT === "json") {
    const line = JSON.stringify({ ts, level, message, ...meta });
    if (level === "error") console.error(line);
    else console.log(line);
    return;
  }
  const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${ts}] ${level.toUpperCase()} ${message}${suffix}`;
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
