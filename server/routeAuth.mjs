import { userHasAnyPermission, userHasPermission } from "./permissions.mjs";

export function denyPermission(res, message = "Permission denied") {
  res.status(403).json({ error: message });
  return null;
}

export async function requireStaffArea(req, res, db, validateSession, getBearerToken) {
  const token = getBearerToken(req);
  const user = token ? await validateSession(db, token) : null;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  if (user.role === "user") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export async function requirePermission(req, res, db, permission, validateSession, getBearerToken) {
  const user = await requireStaffArea(req, res, db, validateSession, getBearerToken);
  if (!user) return null;
  if (!userHasPermission(user, permission)) return denyPermission(res);
  return user;
}

export async function requireAnyPermission(req, res, db, permissions, validateSession, getBearerToken) {
  const user = await requireStaffArea(req, res, db, validateSession, getBearerToken);
  if (!user) return null;
  if (!userHasAnyPermission(user, permissions)) return denyPermission(res);
  return user;
}

export function taxonomyActionPermission(level, action) {
  const allowed = ["subjects", "systems", "chapters", "topics"];
  if (!allowed.includes(level)) return null;
  return `settings.${level}.${action}`;
}

/** Home (Concept Builder) or Create AI extract — upload/source checked per page keys */
export async function requireExtractAccess(req, res, db, validateSession, getBearerToken, { hasFile, hasText }) {
  const user = await requireAnyPermission(
    req,
    res,
    db,
    ["home.extract", "question_bank.create_ai.extract"],
    validateSession,
    getBearerToken,
  );
  if (!user) return null;
  if (hasFile && !userHasAnyPermission(user, ["home.upload", "question_bank.create_ai.upload"])) {
    return denyPermission(res, "No permission to upload image/PDF for extract");
  }
  if (hasText && !hasFile && !userHasAnyPermission(user, ["home.source_text", "question_bank.create_ai.source_text"])) {
    return denyPermission(res, "No permission to use source text for extract");
  }
  return user;
}

/** Create Question (AI) page only */
export async function requireCreateAiExtractAccess(req, res, db, validateSession, getBearerToken, { hasFile, hasText }) {
  const user = await requirePermission(
    req,
    res,
    db,
    "question_bank.create_ai.extract",
    validateSession,
    getBearerToken,
  );
  if (!user) return null;
  if (hasFile && !userHasPermission(user, "question_bank.create_ai.upload")) {
    return denyPermission(res, "No permission to upload image/PDF for extract");
  }
  if (hasText && !hasFile && !userHasPermission(user, "question_bank.create_ai.source_text")) {
    return denyPermission(res, "No permission to use source text for extract");
  }
  return user;
}
