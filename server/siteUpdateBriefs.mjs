import { randomUUID } from "crypto";
import { getAppSetting } from "./appSettings.mjs";

export const SITE_UPDATE_BRIEFS_KEY = "site_update_briefs";

function emptyStore() {
  return { sessions: [] };
}

function parseStore(raw) {
  if (raw == null || raw === "") return emptyStore();
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    return { sessions };
  } catch {
    return emptyStore();
  }
}

async function readStore(db) {
  const row = await getAppSetting(db, SITE_UPDATE_BRIEFS_KEY);
  return parseStore(row?.value);
}

async function writeStore(db, store) {
  const value = JSON.stringify({ sessions: store.sessions ?? [] });
  const { data, error } = await db
    .from("app_settings")
    .upsert({ key: SITE_UPDATE_BRIEFS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("updated_at")
    .single();
  if (error) throw error;
  return { store, updated_at: data?.updated_at ?? null };
}

function sanitizeAdvanced(input, fallback) {
  const src = input && typeof input === "object" ? input : {};
  const priority = ["low", "normal", "high", "urgent"].includes(src.priority) ? src.priority : fallback.priority;
  return {
    priority,
    visibility: src.visibility === "shareable" ? "shareable" : "admin",
    tags: Array.isArray(src.tags)
      ? src.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : fallback.tags,
    assignee: typeof src.assignee === "string" ? src.assignee.trim().slice(0, 120) : fallback.assignee,
    dueAt: typeof src.dueAt === "string" && src.dueAt.trim() ? src.dueAt.trim() : null,
    pinned: Boolean(src.pinned),
    includePathsInShare: src.includePathsInShare !== false,
    allowCopyExport: src.allowCopyExport !== false,
  };
}

function sanitizeItemAdvanced(input) {
  const src = input && typeof input === "object" ? input : {};
  const priority = ["low", "normal", "high", "urgent"].includes(src.priority) ? src.priority : "normal";
  return {
    priority,
    done: Boolean(src.done),
    note: typeof src.note === "string" ? src.note.trim().slice(0, 2000) : "",
  };
}

function sanitizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const pageId = String(raw.pageId ?? "").trim();
  if (!pageId) return null;
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : randomUUID(),
    pageId,
    optionId: typeof raw.optionId === "string" && raw.optionId.trim() ? raw.optionId.trim() : null,
    description: description.slice(0, 20000),
    advanced: sanitizeItemAdvanced(raw.advanced),
  };
}

function sanitizeSession(raw, { keepShare = true } = {}) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid session");
  const now = new Date().toISOString();
  const status = ["open", "saved", "done", "archived"].includes(raw.status) ? raw.status : "open";
  const items = Array.isArray(raw.items)
    ? raw.items.map(sanitizeItem).filter(Boolean).slice(0, 200)
    : [];
  const advanced = sanitizeAdvanced(raw.advanced, {
    priority: "normal",
    visibility: "admin",
    tags: [],
    assignee: "",
    dueAt: null,
    pinned: false,
    includePathsInShare: true,
    allowCopyExport: true,
  });

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : randomUUID(),
    title: (typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Update session").slice(0, 200),
    status,
    shareEnabled: keepShare ? Boolean(raw.shareEnabled) : false,
    shareToken: keepShare && typeof raw.shareToken === "string" ? raw.shareToken : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: now,
    advanced,
    items,
  };
}

export async function listSiteUpdateSessions(db) {
  const store = await readStore(db);
  const sessions = [...store.sessions].sort((a, b) => {
    if (Boolean(a.advanced?.pinned) !== Boolean(b.advanced?.pinned)) {
      return a.advanced?.pinned ? -1 : 1;
    }
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
  return { sessions, catalogHint: true };
}

export async function getSiteUpdateSession(db, id) {
  const store = await readStore(db);
  const session = store.sessions.find((s) => s.id === id);
  if (!session) throw new Error("Session not found");
  return { session };
}

export async function createSiteUpdateSession(db, body = {}) {
  const store = await readStore(db);
  const session = sanitizeSession(
    {
      ...body,
      id: randomUUID(),
      status: "open",
      shareEnabled: false,
      shareToken: null,
      items: Array.isArray(body.items) ? body.items : [],
    },
    { keepShare: false },
  );
  store.sessions.unshift(session);
  await writeStore(db, store);
  return { session };
}

export async function saveSiteUpdateSession(db, id, body = {}) {
  const store = await readStore(db);
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Session not found");
  const prev = store.sessions[idx];
  const next = sanitizeSession(
    {
      ...prev,
      ...body,
      id: prev.id,
      createdAt: prev.createdAt,
      shareEnabled: prev.shareEnabled,
      shareToken: prev.shareToken,
      status: body.status ?? (body.items ? "saved" : prev.status),
    },
    { keepShare: true },
  );
  if (next.status === "open" && Array.isArray(body.items)) next.status = "saved";
  store.sessions[idx] = next;
  await writeStore(db, store);
  return { session: next };
}

export async function deleteSiteUpdateSession(db, id) {
  const store = await readStore(db);
  const next = store.sessions.filter((s) => s.id !== id);
  if (next.length === store.sessions.length) throw new Error("Session not found");
  await writeStore(db, { sessions: next });
  return { ok: true };
}

export async function enableSiteUpdateShare(db, id) {
  const store = await readStore(db);
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Session not found");
  const session = store.sessions[idx];
  session.shareEnabled = true;
  session.shareToken = session.shareToken || randomUUID().replace(/-/g, "");
  session.advanced = sanitizeAdvanced(
    { ...session.advanced, visibility: "shareable" },
    session.advanced,
  );
  session.updatedAt = new Date().toISOString();
  store.sessions[idx] = session;
  await writeStore(db, store);
  return { session, shareToken: session.shareToken };
}

export async function disableSiteUpdateShare(db, id) {
  const store = await readStore(db);
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Session not found");
  const session = store.sessions[idx];
  session.shareEnabled = false;
  session.updatedAt = new Date().toISOString();
  store.sessions[idx] = session;
  await writeStore(db, store);
  return { session };
}

export async function getSharedSiteUpdateSession(db, token) {
  const t = String(token ?? "").trim();
  if (!t) throw new Error("Invalid share token");
  const store = await readStore(db);
  const session = store.sessions.find((s) => s.shareEnabled && s.shareToken === t);
  if (!session) throw new Error("Shared session not found or sharing disabled");
  return {
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      updatedAt: session.updatedAt,
      advanced: {
        priority: session.advanced?.priority ?? "normal",
        tags: session.advanced?.tags ?? [],
        assignee: session.advanced?.assignee ?? "",
        dueAt: session.advanced?.dueAt ?? null,
        includePathsInShare: session.advanced?.includePathsInShare !== false,
        allowCopyExport: session.advanced?.allowCopyExport !== false,
      },
      items: (session.items ?? []).map((item) => ({
        id: item.id,
        pageId: item.pageId,
        optionId: item.optionId,
        description: item.description,
        advanced: {
          priority: item.advanced?.priority ?? "normal",
          done: Boolean(item.advanced?.done),
          note: item.advanced?.note ?? "",
        },
      })),
    },
  };
}
