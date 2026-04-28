import { execSync } from "node:child_process";

const port = Number(process.env.PORT || 8787);

function killOnWindows(targetPort) {
  const output = execSync(`netstat -ano | findstr :${targetPort}`, { stdio: ["ignore", "pipe", "ignore"] })
    .toString();
  const pids = Array.from(
    new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/\s+/).at(-1))
        .filter((pid) => pid && pid !== "0"),
    ),
  );

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } catch {
      // Ignore kill errors; process may already be gone.
    }
  }
}

try {
  if (process.platform === "win32") {
    killOnWindows(port);
  }
} catch {
  // No listener on this port; safe to continue.
}

