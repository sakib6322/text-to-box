import bcrypt from "bcryptjs";
import {
  EXTRACT_CONCEPT_PROMPT_KEY,
  EXTRACT_KEY_POINTS_PROMPT_KEY,
  EXTRACT_QUESTIONS_PROMPT_KEY,
  QUESTION_EXPLANATIONS_PROMPT_KEY,
  MATCHING_AI_ENABLED_KEY,
  MATCHING_PROMPT_KEY,
  MATCHING_VECTOR_ENABLED_KEY,
  getDefaultExtractConceptPrompt,
  getDefaultExtractKeyPointsPrompt,
  getDefaultExtractQuestionsPrompt,
  getDefaultQuestionExplanationsPrompt,
  getDefaultMatchingPrompt,
} from "./promptDefaults.mjs";

export async function getAppSetting(db, key) {
  const { data, error } = await db
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getPromptFromDb(db, key, getDefault) {
  const row = await getAppSetting(db, key);
  const trimmed = typeof row?.value === "string" ? row.value.trim() : "";
  if (trimmed) {
    return { prompt: trimmed, source: "database", updated_at: row.updated_at ?? null };
  }
  return {
    prompt: getDefault(),
    source: "default",
    updated_at: null,
  };
}

async function savePromptToDb(db, key, prompt) {
  const value = String(prompt ?? "").trim();
  if (!value) throw new Error("Prompt cannot be empty");
  const { data, error } = await db
    .from("app_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();
  if (error) throw error;
  return { prompt: data.value, source: "database", updated_at: data.updated_at };
}

async function saveBoolSetting(db, key, value) {
  const { error } = await db
    .from("app_settings")
    .upsert({ key, value: value ? "true" : "false", updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

function parseBoolSetting(value, defaultValue) {
  if (value == null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

async function deleteAppSetting(db, key) {
  const { error } = await db.from("app_settings").delete().eq("key", key);
  if (error) throw error;
}

async function resetPromptInDb(db, key, getDefault) {
  const { error } = await db.from("app_settings").delete().eq("key", key);
  if (error) throw error;
  return {
    prompt: getDefault(),
    source: "default",
    updated_at: null,
  };
}

export async function getExtractQuestionsPrompt(db) {
  return getPromptFromDb(db, EXTRACT_QUESTIONS_PROMPT_KEY, getDefaultExtractQuestionsPrompt);
}

export async function saveExtractQuestionsPrompt(db, prompt) {
  return savePromptToDb(db, EXTRACT_QUESTIONS_PROMPT_KEY, prompt);
}

export async function resetExtractQuestionsPrompt(db) {
  return resetPromptInDb(db, EXTRACT_QUESTIONS_PROMPT_KEY, getDefaultExtractQuestionsPrompt);
}

export async function getExtractConceptPrompt(db) {
  return getPromptFromDb(db, EXTRACT_CONCEPT_PROMPT_KEY, getDefaultExtractConceptPrompt);
}

export async function saveExtractConceptPrompt(db, prompt) {
  return savePromptToDb(db, EXTRACT_CONCEPT_PROMPT_KEY, prompt);
}

export async function resetExtractConceptPrompt(db) {
  return resetPromptInDb(db, EXTRACT_CONCEPT_PROMPT_KEY, getDefaultExtractConceptPrompt);
}

export async function getExtractKeyPointsPrompt(db) {
  return getPromptFromDb(db, EXTRACT_KEY_POINTS_PROMPT_KEY, getDefaultExtractKeyPointsPrompt);
}

export async function saveExtractKeyPointsPrompt(db, prompt) {
  return savePromptToDb(db, EXTRACT_KEY_POINTS_PROMPT_KEY, prompt);
}

export async function resetExtractKeyPointsPrompt(db) {
  return resetPromptInDb(db, EXTRACT_KEY_POINTS_PROMPT_KEY, getDefaultExtractKeyPointsPrompt);
}

export async function getQuestionExplanationsPrompt(db) {
  return getPromptFromDb(db, QUESTION_EXPLANATIONS_PROMPT_KEY, getDefaultQuestionExplanationsPrompt);
}

export async function saveQuestionExplanationsPrompt(db, prompt) {
  return savePromptToDb(db, QUESTION_EXPLANATIONS_PROMPT_KEY, prompt);
}

export async function resetQuestionExplanationsPrompt(db) {
  return resetPromptInDb(db, QUESTION_EXPLANATIONS_PROMPT_KEY, getDefaultQuestionExplanationsPrompt);
}

export async function getMatchingPrompt(db) {
  return getPromptFromDb(db, MATCHING_PROMPT_KEY, getDefaultMatchingPrompt);
}

export async function saveMatchingPrompt(db, prompt) {
  return savePromptToDb(db, MATCHING_PROMPT_KEY, prompt);
}

export async function resetMatchingPrompt(db) {
  return resetPromptInDb(db, MATCHING_PROMPT_KEY, getDefaultMatchingPrompt);
}

export async function getMatchingPromptConfig(db) {
  const [promptRes, vectorRow, aiRow] = await Promise.all([
    getMatchingPrompt(db),
    getAppSetting(db, MATCHING_VECTOR_ENABLED_KEY),
    getAppSetting(db, MATCHING_AI_ENABLED_KEY),
  ]);
  return {
    prompt: promptRes.prompt,
    source: promptRes.source,
    updated_at: promptRes.updated_at,
    vector_enabled: parseBoolSetting(vectorRow?.value, true),
    ai_enabled: parseBoolSetting(aiRow?.value, false),
    vector_source: vectorRow?.value != null ? "database" : "default",
    ai_source: aiRow?.value != null ? "database" : "default",
  };
}

export async function saveMatchingPromptConfig(db, { prompt, vector_enabled, ai_enabled }) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Matching prompt is required");
  }
  await saveMatchingPrompt(db, prompt);
  if (typeof vector_enabled === "boolean") {
    await saveBoolSetting(db, MATCHING_VECTOR_ENABLED_KEY, vector_enabled);
  }
  if (typeof ai_enabled === "boolean") {
    await saveBoolSetting(db, MATCHING_AI_ENABLED_KEY, ai_enabled);
  }
  return getMatchingPromptConfig(db);
}

export async function resetMatchingPromptConfig(db) {
  await Promise.all([
    resetMatchingPrompt(db),
    deleteAppSetting(db, MATCHING_VECTOR_ENABLED_KEY),
    deleteAppSetting(db, MATCHING_AI_ENABLED_KEY),
  ]);
  return getMatchingPromptConfig(db);
}

const SESSION_DAYS = 30;

export async function registerUser(db, email, password) {
  const e = String(email ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!e || !p) throw new Error("Email and password required");
  if (p.length < 3) throw new Error("Password must be at least 3 characters");

  const { data: existing } = await db.from("app_users").select("id").eq("email", e).maybeSingle();
  if (existing) throw new Error("Email already registered");

  const password_hash = await bcrypt.hash(p, 10);
  const { data: user, error } = await db
    .from("app_users")
    .insert({ email: e, password_hash, role: "user" })
    .select("id, email, role, created_at")
    .single();
  if (error) throw error;
  return user;
}

export async function loginUser(db, email, password, { adminOnly = false, userOnly = false } = {}) {
  const e = String(email ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!e || !p) throw new Error("Email and password required");

  const { data: user, error } = await db
    .from("app_users")
    .select("id, email, password_hash, role, permissions, display_name, created_at")
    .eq("email", e)
    .maybeSingle();
  if (error) {
    const msg = String(error.message ?? "");
    if (msg.includes("permissions")) {
      throw new Error("Database migration required for staff login. Run 20260717160000_user_permissions.sql on Supabase.");
    }
    throw error;
  }
  if (!user) throw new Error("Invalid email or password");

  const ok = await bcrypt.compare(p, user.password_hash);
  if (!ok) throw new Error("Invalid email or password");

  if (adminOnly && user.role !== "admin" && user.role !== "staff") {
    throw new Error("Admin access only — use user login to register");
  }
  if (adminOnly && user.role === "staff") {
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.length === 0) throw new Error("No permissions assigned — contact administrator");
  }
  if (userOnly && user.role === "admin") throw new Error("Use Admin tab for administrator login");

  const expires_at = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: session, error: sessErr } = await db
    .from("app_sessions")
    .insert({ user_id: user.id, expires_at })
    .select("id, expires_at")
    .single();
  if (sessErr) throw sessErr;

  const permissions =
    user.role === "admin"
      ? null
      : Array.isArray(user.permissions)
        ? user.permissions.filter((k) => typeof k === "string")
        : [];

  return {
    token: session.id,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions,
      displayName: user.display_name ?? null,
      createdAt: user.created_at,
    },
  };
}

export async function validateSession(db, token) {
  const id = String(token ?? "").trim();
  if (!id) return null;

  const { data: session, error } = await db
    .from("app_sessions")
    .select("id, user_id, expires_at, app_users(id, email, role, permissions, display_name, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (error || !session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.from("app_sessions").delete().eq("id", id);
    return null;
  }
  const u = session.app_users;
  if (!u) return null;
  const permissions =
    u.role === "admin"
      ? null
      : Array.isArray(u.permissions)
        ? u.permissions.filter((k) => typeof k === "string")
        : [];
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    permissions,
    displayName: u.display_name ?? null,
    createdAt: u.created_at ?? null,
    sessionId: session.id,
  };
}

export async function updateUserProfile(db, userId, { displayName, currentPassword, newPassword } = {}) {
  const uid = String(userId ?? "").trim();
  if (!uid) throw new Error("User id required");

  const { data: user, error } = await db
    .from("app_users")
    .select("id, password_hash")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!user) throw new Error("User not found");

  const patch = { updated_at: new Date().toISOString() };
  if (typeof displayName === "string") patch.display_name = displayName.trim() || null;

  const nextPassword = typeof newPassword === "string" ? newPassword.trim() : "";
  if (nextPassword) {
    const current = String(currentPassword ?? "");
    if (!current) throw new Error("Current password is required");
    const ok = await bcrypt.compare(current, user.password_hash);
    if (!ok) throw new Error("Current password is incorrect");
    if (nextPassword.length < 3) throw new Error("New password must be at least 3 characters");
    patch.password_hash = await bcrypt.hash(nextPassword, 10);
  }

  if (Object.keys(patch).length <= 1) throw new Error("Nothing to update");

  const { data: updated, error: upErr } = await db
    .from("app_users")
    .update(patch)
    .eq("id", uid)
    .select("id, email, role, permissions, display_name, created_at")
    .single();
  if (upErr) throw upErr;
  return updated;
}

export async function logoutSession(db, token) {
  const id = String(token ?? "").trim();
  if (!id) return;
  await db.from("app_sessions").delete().eq("id", id);
}

export {
  EXTRACT_CONCEPT_PROMPT_KEY,
  EXTRACT_KEY_POINTS_PROMPT_KEY,
  EXTRACT_QUESTIONS_PROMPT_KEY,
  QUESTION_EXPLANATIONS_PROMPT_KEY,
  MATCHING_PROMPT_KEY,
  MATCHING_VECTOR_ENABLED_KEY,
  MATCHING_AI_ENABLED_KEY,
  getDefaultExtractConceptPrompt,
  getDefaultExtractKeyPointsPrompt,
  getDefaultExtractQuestionsPrompt,
  getDefaultQuestionExplanationsPrompt,
  getDefaultMatchingPrompt,
};








