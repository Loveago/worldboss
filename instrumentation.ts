import { spawn } from "child_process";
import path from "path";

let workerStarted = false;

export function register() {
  if (workerStarted) return;
  workerStarted = true;

  // Skip auto-spawn when running under PM2 (use pm2.config.js instead)
  if (process.env.PM2_HOME || process.env.pm_id) {
    console.log("[instrumentation] PM2 detected — worker managed by pm2.config.js, skipping auto-spawn");
    return;
  }

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    console.log("[instrumentation] Worker will start 30s after server boot (dev mode)");
  } else {
    console.log("[instrumentation] Worker will start 30s after server boot (production)");
  }

  setTimeout(() => {
    const workerPath = path.resolve(process.cwd(), "workers", "encart-status.ts");

    console.log(`[instrumentation] Starting Encart worker: ${workerPath}`);

    const child = spawn("npx", ["tsx", workerPath], {
      detached: true,
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (err) => {
      console.error("[instrumentation] Failed to start Encart worker:", err.message);
    });

    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[instrumentation] Encart worker exited with code ${code}`);
      }
    });

    console.log(`[instrumentation] Encart worker spawned (pid: ${child.pid})`);
  }, 30_000);
}
