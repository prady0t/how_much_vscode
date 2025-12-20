import { activeWindow, type WindowInfo } from "@miniben90/x-win";
import * as fs from "fs";
import * as path from "path";
import * as TOML from "@iarna/toml";

const POLL_MS = 1000;
const LOG_DIR = "./logs";
const MIN_ACTIVE_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────
// Session metadata
// ─────────────────────────────────────────────
const sessionStart = new Date();
const sessionId = sessionStart
  .toISOString()
  .replace(/:/g, "-")
  .replace("T", "_")
  .split(".")[0];

const logFilePath = path.join(
  LOG_DIR,
  `vscode-${sessionId}.toml`
);

// Ensure log dir exists
fs.mkdirSync(LOG_DIR, { recursive: true });

// ─────────────────────────────────────────────
// Tracking state
// ─────────────────────────────────────────────
let vscodeActiveSince: number | null = null;
let totalMs = 0;
let lastWindowInfo: WindowInfo | null = null;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function isVSCode(win: WindowInfo): boolean {
  const info = win.info;
  if (!info) return false;

  return (
    info.name === "Code" ||
    info.execName === "Visual Studio Code.app" ||
    info.path?.includes("Visual Studio Code.app")
  );
}

function format(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

// ─────────────────────────────────────────────
// TOML flush
// ─────────────────────────────────────────────
function flushLog(final = false) {
  const now = Date.now();

  if (vscodeActiveSince !== null) {
    totalMs += now - vscodeActiveSince;
    vscodeActiveSince = now;
  }

  // Do not save short sessions
  if (final && totalMs < MIN_ACTIVE_MS) {
    console.log(
      `Session active time (${format(totalMs)}) < 5 minutes, skipping log`
    );
    return;
  }

  const payload = {
    session: {
      id: sessionId,
      started_at: sessionStart.toISOString(),
      ended_at: final ? new Date().toISOString() : null,
      total_active_ms: totalMs,
      total_active_human: format(totalMs),
    },

    vscode: lastWindowInfo?.info
      ? {
          process_id: lastWindowInfo.info.processId,
          name: lastWindowInfo.info.name,
          exec_name: lastWindowInfo.info.execName,
          path: lastWindowInfo.info.path,
        }
      : null,

    window: lastWindowInfo
      ? {
          id: lastWindowInfo.id,
          title: lastWindowInfo.title || "",
          position: lastWindowInfo.position,
          usage: lastWindowInfo.usage,
        }
      : null,
  };

  fs.writeFileSync(logFilePath, TOML.stringify(payload));
}

// ─────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────
function tick() {
  try {
    const now = Date.now();
    const win = activeWindow();

    const vscodeActive = win && isVSCode(win);

    if (vscodeActive) {
      lastWindowInfo = win;

      if (vscodeActiveSince === null) {
        vscodeActiveSince = now;
      }
    } else {
      if (vscodeActiveSince !== null) {
        totalMs += now - vscodeActiveSince;
        vscodeActiveSince = null;
      }
    }

    const runningTotal =
      totalMs + (vscodeActiveSince ? now - vscodeActiveSince : 0);

    process.stdout.write(
      `\rVS Code session time: ${format(runningTotal)}`
    );
  } catch (err) {
    console.error("Tracking error:", err);
  }
}

// ─────────────────────────────────────────────
// Exit handling (critical)
// ─────────────────────────────────────────────
function shutdown() {
  console.log("\nSaving session log...");
  flushLog(true);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => flushLog(true));

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
console.log("Tracking VS Code usage (Ctrl+C to stop)");
setInterval(tick, POLL_MS);
