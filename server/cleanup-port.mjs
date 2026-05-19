import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const port = Number(process.env.PORT || 8787);
const maxWaitMs = Number(process.env.CLEANUP_PORT_WAIT_MS || 8000);

function getListeningPids(targetPort) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${targetPort}`, {
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();
      return Array.from(
        new Set(
          output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.includes("LISTENING"))
            .map((line) => line.split(/\s+/).at(-1))
            .filter((pid) => pid && pid !== "0"),
        ),
      );
    }

    const output = execSync(`ss -tlnp 'sport = :${targetPort}'`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    const re = /pid=(\d+)/g;
    let match;
    while ((match = re.exec(output)) !== null) {
      pids.add(match[1]);
    }
    return Array.from(pids);
  } catch {
    try {
      const output = execSync(`lsof -ti :${targetPort} -sTCP:LISTEN`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return output.split(/\r?\n/).filter(Boolean);
    } catch {
      return [];
    }
  }
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } else {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      }
    } catch {
      // Process may already be gone.
    }
  }
}

function pm2Command(args) {
  try {
    execSync(`pm2 ${args}`, { stdio: "ignore", timeout: 10000 });
    return true;
  } catch {
    try {
      execSync(`npx --yes pm2 ${args}`, { stdio: "ignore", timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }
}

function pm2Jlist() {
  try {
    return execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000 });
  } catch {
    return execSync("npx --yes pm2 jlist", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15000,
    });
  }
}

/** PM2 auto-restarts killed children; stop those apps so dev can bind the port. */
function stopPm2OnPort(targetPort) {
  pm2Command("stop pgdiary-api");

  const pidsOnPort = new Set(getListeningPids(targetPort));
  if (pidsOnPort.size === 0) return;

  let apps;
  try {
    apps = JSON.parse(pm2Jlist());
  } catch {
    return;
  }
  if (!Array.isArray(apps)) return;

  for (const app of apps) {
    const pmPid = String(app?.pid ?? "");
    if (!pmPid || !pidsOnPort.has(pmPid)) continue;
    const id = app.pm_id ?? app.pm2_env?.pm_id;
    if (id == null) continue;
    pm2Command(`stop ${id}`);
  }
}

async function freePort(targetPort) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    stopPm2OnPort(targetPort);

    const pids = getListeningPids(targetPort);
    if (pids.length === 0) return;

    killPids(pids);
    await setTimeout(250);
  }

  const remaining = getListeningPids(targetPort);
  if (remaining.length > 0) {
    console.warn(`[cleanup-port] Port ${targetPort} still in use by PID(s): ${remaining.join(", ")}`);
    process.exitCode = 1;
  }
}

await freePort(port);
