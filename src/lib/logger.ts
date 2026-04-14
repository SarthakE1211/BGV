// Minimal structured logger. One JSON line per event so the output is
// greppable locally and parseable by any log aggregator (CloudWatch,
// Datadog, Loki) once we ship.
//
// Intentionally dependency-free. When we add a real backend, swap the
// write() implementation — call sites don't change.

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
    [key: string]: unknown;
}

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL: number =
    LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

function write(level: Level, msg: string, fields?: LogFields) {
    if (LEVELS[level] < MIN_LEVEL) return;
    const entry = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...(fields ?? {}),
    };
    // Keep error-level on stderr; everything else on stdout.
    const line = JSON.stringify(entry, errorReplacer);
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
}

// JSON.stringify drops Error.message/stack by default — surface them.
function errorReplacer(_key: string, value: unknown) {
    if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
}

export const logger = {
    debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
    info: (msg: string, fields?: LogFields) => write("info", msg, fields),
    warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
    error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};
