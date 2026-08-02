import { Readable } from "node:stream";
import { google } from "googleapis";
import { getAppSetting } from "./appSettings.mjs";
import { getUiAppearance } from "./uiAppearance.mjs";

export const GDRIVE_CLIENT_EMAIL_KEY = "gdrive_client_email";
export const GDRIVE_PRIVATE_KEY_KEY = "gdrive_private_key";

const FOLDER_ID_RE = /^[a-zA-Z0-9_-]{10,128}$/;

function normalizePrivateKey(raw) {
  let key = String(raw ?? "").trim();
  if (!key) return "";
  // Allow JSON-escaped newlines from .env
  key = key.replace(/\\n/g, "\n");
  return key;
}

function parseServiceAccountJson(raw) {
  const text = String(raw ?? "").trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    const clientEmail = typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
    const privateKey = normalizePrivateKey(parsed.private_key);
    if (!clientEmail || !privateKey) return null;
    return { clientEmail, privateKey };
  } catch {
    return null;
  }
}

export async function resolveGdriveCredentials(db) {
  const envJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim();
  if (envJson) {
    const fromJson = parseServiceAccountJson(envJson);
    if (fromJson) return { ...fromJson, source: "env_json" };
  }

  const envEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const envKey = normalizePrivateKey(process.env.GOOGLE_DRIVE_PRIVATE_KEY);
  if (envEmail && envKey) {
    return { clientEmail: envEmail, privateKey: envKey, source: "env" };
  }

  if (!db) return null;
  const [emailRow, keyRow] = await Promise.all([
    getAppSetting(db, GDRIVE_CLIENT_EMAIL_KEY),
    getAppSetting(db, GDRIVE_PRIVATE_KEY_KEY),
  ]);
  const clientEmail = typeof emailRow?.value === "string" ? emailRow.value.trim() : "";
  const privateKey = normalizePrivateKey(keyRow?.value);
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey, source: "app_settings" };
}

export async function getGdriveUploadStatus(db) {
  const creds = await resolveGdriveCredentials(db);
  let folderId = "";
  let uploadEnabled = false;
  try {
    const packed = await getUiAppearance(db);
    const re = packed?.appearance?.richEditor;
    folderId = String(re?.googleDriveFolderId ?? "").trim();
    uploadEnabled = Boolean(re?.googleDriveUpload);
  } catch {
    /* appearance may be unavailable */
  }
  return {
    configured: Boolean(creds),
    clientEmail: creds?.clientEmail ?? null,
    source: creds?.source ?? null,
    folderId,
    uploadEnabled,
    ready: Boolean(creds && folderId && uploadEnabled),
  };
}

export async function saveGdriveCredentials(db, { clientEmail, privateKey } = {}) {
  let email = typeof clientEmail === "string" ? clientEmail.trim() : "";
  let key = typeof privateKey === "string" ? privateKey.trim() : "";

  const fromJson = parseServiceAccountJson(key) || parseServiceAccountJson(email);
  if (fromJson) {
    email = fromJson.clientEmail;
    key = fromJson.privateKey;
  } else {
    key = normalizePrivateKey(key);
  }

  const existing = await resolveGdriveCredentials(db);
  if (!email && existing?.clientEmail) email = existing.clientEmail;
  if (!key && existing?.privateKey) key = existing.privateKey;

  if (!email || !key) {
    throw new Error("Service account client email and private key are required");
  }
  if (!email.includes("@")) {
    throw new Error("Invalid service account client email");
  }
  if (!key.includes("PRIVATE KEY")) {
    throw new Error("Private key must be a PEM block (or paste the full JSON key file)");
  }

  const now = new Date().toISOString();
  const { error: e1 } = await db
    .from("app_settings")
    .upsert({ key: GDRIVE_CLIENT_EMAIL_KEY, value: email, updated_at: now }, { onConflict: "key" });
  if (e1) throw e1;
  const { error: e2 } = await db
    .from("app_settings")
    .upsert({ key: GDRIVE_PRIVATE_KEY_KEY, value: key, updated_at: now }, { onConflict: "key" });
  if (e2) throw e2;

  return getGdriveUploadStatus(db);
}

function createDriveClient(creds) {
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

/**
 * Upload image buffer to configured Drive folder; make link-readable; return proxy URL.
 */
export async function uploadImageToGoogleDrive(db, { buffer, mimeType, filename }) {
  const packed = await getUiAppearance(db);
  const re = packed?.appearance?.richEditor ?? {};
  if (!re.googleDriveUpload) {
    throw new Error("Google Drive upload is disabled in Appearance → Rich editor");
  }
  const folderId = String(re.googleDriveFolderId ?? "").trim();
  if (!FOLDER_ID_RE.test(folderId)) {
    throw new Error("Set a valid Google Drive folder ID in Appearance → Rich editor");
  }

  const creds = await resolveGdriveCredentials(db);
  if (!creds) {
    throw new Error("Google Drive credentials are not configured");
  }

  const drive = createDriveClient(creds);
  const name = String(filename || "image.jpg").replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "image.jpg";
  const mime = mimeType?.startsWith("image/") ? mimeType : "image/jpeg";

  const created = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType: mime,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const fileId = created.data?.id;
  if (!fileId) throw new Error("Drive upload returned no file id");

  try {
    await drive.permissions.create({
      fileId,
      requestBody: { type: "anyone", role: "reader" },
      supportsAllDrives: true,
    });
  } catch (e) {
    console.warn("Drive public permission failed:", e?.message ?? e);
  }

  return {
    fileId,
    url: `/api/gdrive-image/${fileId}`,
    webViewLink: created.data.webViewLink ?? null,
    webContentLink: created.data.webContentLink ?? null,
  };
}

/**
 * @param {import('express').Express} app
 * @param {{
 *   requireSupabase: Function,
 *   requireAuthUser: Function,
 *   requirePerm: Function,
 *   upload: import('multer').Multer,
 * }} deps
 */
export function registerGdriveUploadRoutes(app, { requireSupabase, requireAuthUser, requirePerm, upload }) {
  app.get("/api/settings/gdrive-upload", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "settings.appearance.edit"))) return;
      return res.json(await getGdriveUploadStatus(db));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to load Drive status" });
    }
  });

  app.put("/api/settings/gdrive-upload", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "settings.appearance.edit"))) return;
      const status = await saveGdriveCredentials(db, {
        clientEmail: req.body?.clientEmail,
        privateKey: req.body?.privateKey,
      });
      return res.json(status);
    } catch (e) {
      console.error(e);
      return res.status(400).json({ error: e instanceof Error ? e.message : "Failed to save credentials" });
    }
  });

  app.post("/api/gdrive-upload", upload.single("image"), async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (user.role !== "admin" && user.role !== "staff") {
        return res.status(403).json({ error: "Staff or admin required to upload images" });
      }

      const file = req.file;
      if (!file?.buffer?.length) {
        return res.status(400).json({ error: "Image file required (field name: image)" });
      }
      if (!file.mimetype?.startsWith("image/")) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      const result = await uploadImageToGoogleDrive(db, {
        buffer: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
      });
      return res.json(result);
    } catch (e) {
      console.error(e);
      return res.status(400).json({ error: e instanceof Error ? e.message : "Drive upload failed" });
    }
  });
}
