import bcrypt from "bcryptjs";
import { ALL_PERMISSION_KEYS, normalizePermissions } from "./permissions.mjs";

function sanitizeUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    display_name: row.display_name ?? null,
    permissions: row.role === "admin" ? ALL_PERMISSION_KEYS : normalizePermissions(row.permissions),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export async function listAccessUsers(db) {
  const { data, error } = await db
    .from("app_users")
    .select("id, email, role, permissions, display_name, created_at, updated_at")
    .in("role", ["admin", "staff"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(sanitizeUserRow);
}

function formatAccessDbError(error) {
  const msg = String(error?.message ?? error ?? "Database error");
  const code = String(error?.code ?? "");
  if (
    code === "23514" ||
    msg.includes("app_users_role_check") ||
    msg.includes("'staff'") ||
    msg.includes("permissions") ||
    msg.includes("display_name")
  ) {
    return "Database migration required. Run supabase/migrations/20260717160000_user_permissions.sql in Supabase SQL Editor, then retry.";
  }
  return msg;
}

export async function createStaffUser(db, { email, password, permissions, displayName }) {
  const e = String(email ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!e || !p) throw new Error("Email and password required");
  if (p.length < 3) throw new Error("Password must be at least 3 characters");

  const perms = normalizePermissions(permissions);
  if (perms.length === 0) throw new Error("Select at least one permission");

  const now = new Date().toISOString();
  const password_hash = await bcrypt.hash(p, 10);

  const { data: existing, error: findErr } = await db
    .from("app_users")
    .select("id, email, role")
    .eq("email", e)
    .maybeSingle();
  if (findErr) throw new Error(formatAccessDbError(findErr));

  if (existing) {
    if (existing.role === "admin") {
      throw new Error("This email belongs to a full administrator account");
    }
    const { data, error } = await db
      .from("app_users")
      .update({
        role: "staff",
        password_hash,
        permissions: perms,
        display_name: displayName?.trim() || null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, email, role, permissions, display_name, created_at, updated_at")
      .single();
    if (error) throw new Error(formatAccessDbError(error));
    return sanitizeUserRow(data);
  }

  const { data, error } = await db
    .from("app_users")
    .insert({
      email: e,
      password_hash,
      role: "staff",
      permissions: perms,
      display_name: displayName?.trim() || null,
      updated_at: now,
    })
    .select("id, email, role, permissions, display_name, created_at, updated_at")
    .single();
  if (error) throw new Error(formatAccessDbError(error));
  return sanitizeUserRow(data);
}

export async function updateStaffUser(db, id, { email, password, permissions, displayName }, { actorId } = {}) {
  const userId = String(id ?? "").trim();
  if (!userId) throw new Error("User id required");

  const { data: existing, error: findErr } = await db
    .from("app_users")
    .select("id, email, role, permissions, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new Error("User not found");
  if (existing.role === "admin") throw new Error("Cannot edit full admin accounts here");

  const patch = { updated_at: new Date().toISOString() };

  if (typeof displayName === "string") patch.display_name = displayName.trim() || null;

  if (typeof email === "string" && email.trim()) {
    const e = email.trim().toLowerCase();
    if (e !== existing.email) {
      const { data: dup } = await db.from("app_users").select("id").eq("email", e).maybeSingle();
      if (dup && dup.id !== userId) throw new Error("Email already in use");
      patch.email = e;
    }
  }

  if (Array.isArray(permissions)) {
    const perms = normalizePermissions(permissions);
    if (perms.length === 0) throw new Error("Select at least one permission");
    patch.permissions = perms;
  }

  if (typeof password === "string" && password.trim()) {
    if (password.length < 3) throw new Error("Password must be at least 3 characters");
    patch.password_hash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(patch).length <= 1) throw new Error("Nothing to update");

  const { data, error } = await db
    .from("app_users")
    .update(patch)
    .eq("id", userId)
    .select("id, email, role, permissions, display_name, created_at, updated_at")
    .single();
  if (error) throw error;

  if (actorId && actorId === userId && patch.permissions) {
    await db.from("app_sessions").delete().eq("user_id", userId);
  }

  return sanitizeUserRow(data);
}

export async function deleteStaffUser(db, id, { actorId } = {}) {
  const userId = String(id ?? "").trim();
  if (!userId) throw new Error("User id required");
  if (actorId && actorId === userId) throw new Error("Cannot delete your own account");

  const { data: existing, error: findErr } = await db.from("app_users").select("id, role").eq("id", userId).maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new Error("User not found");
  if (existing.role === "admin") throw new Error("Cannot delete admin accounts");

  const { error } = await db.from("app_users").delete().eq("id", userId);
  if (error) throw error;
  return { ok: true };
}
