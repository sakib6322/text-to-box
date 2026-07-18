/** @typedef {{ key: string; label: string }} PermissionDef */
/** @typedef {{ id: string; label: string; permissions: PermissionDef[] }} PermissionGroup */

/** @type {PermissionGroup[]} */
export const PERMISSION_GROUPS = [
  {
    id: "home",
    label: "Home (Concept Builder)",
    permissions: [
      { key: "home.view", label: "View page" },
      { key: "home.upload", label: "Upload image / PDF for extract" },
      { key: "home.bulk_csv", label: "Bulk CSV / JSON key points (no AI)" },
      { key: "home.source_text", label: "Source text input" },
      { key: "home.extract", label: "Extract concept" },
      { key: "home.add", label: "Add / save concept" },
      { key: "home.edit", label: "Edit concept" },
      { key: "home.delete", label: "Delete concept" },
      { key: "home.match", label: "Suggestion matching" },
    ],
  },
  {
    id: "suggestions",
    label: "Suggestions",
    permissions: [
      { key: "suggestions.view", label: "View page" },
      { key: "suggestions.add", label: "Add key point" },
      { key: "suggestions.edit", label: "Edit key point" },
      { key: "suggestions.delete", label: "Delete key point" },
    ],
  },
  {
    id: "question_bank_create",
    label: "Question Bank → Create Question (AI)",
    permissions: [
      { key: "question_bank.create_ai.view", label: "View page" },
      { key: "question_bank.create_ai.upload", label: "Upload image / PDF for extract" },
      { key: "question_bank.create_ai.source_text", label: "Source text input" },
      { key: "question_bank.create_ai.extract", label: "AI extract" },
      { key: "question_bank.create_ai.bulk", label: "Bulk JSON / CSV questions (no AI)" },
      { key: "question_bank.create_ai.add", label: "Add / save questions" },
      { key: "question_bank.create_ai.edit", label: "Edit draft questions" },
      { key: "question_bank.create_ai.delete", label: "Delete from queue" },
    ],
  },
  {
    id: "question_bank_all",
    label: "Question Bank → All Questions",
    permissions: [
      { key: "question_bank.questions.view", label: "View page" },
      { key: "question_bank.questions.edit", label: "Edit question" },
      { key: "question_bank.questions.delete", label: "Delete question" },
    ],
  },
  {
    id: "exam",
    label: "Exam",
    permissions: [
      { key: "exam.create.view", label: "Create exam — view" },
      { key: "exam.create.add", label: "Create exam — add" },
      { key: "exam.create.edit", label: "Create exam — edit" },
      { key: "exam.schedules.view", label: "Schedules — view" },
      { key: "exam.schedules.edit", label: "Schedules — edit" },
      { key: "exam.schedules.delete", label: "Schedules — delete" },
    ],
  },
  {
    id: "dashboard",
    label: "Admin Dashboard",
    permissions: [{ key: "dashboard.view", label: "View dashboard" }],
  },
  {
    id: "students",
    label: "Students",
    permissions: [
      { key: "students.view", label: "View page" },
      { key: "students.add", label: "Add" },
      { key: "students.edit", label: "Edit" },
      { key: "students.delete", label: "Delete" },
    ],
  },
  {
    id: "teachers",
    label: "Teachers",
    permissions: [
      { key: "teachers.view", label: "View page" },
      { key: "teachers.add", label: "Add" },
      { key: "teachers.edit", label: "Edit" },
      { key: "teachers.delete", label: "Delete" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    permissions: [
      { key: "organization.view", label: "View page" },
      { key: "organization.edit", label: "Edit settings" },
    ],
  },
  {
    id: "settings_connection",
    label: "Settings → General → Connection",
    permissions: [
      { key: "settings.connection.view", label: "View" },
      { key: "settings.connection.edit", label: "Edit / save config" },
      { key: "settings.connection.backup", label: "Backup & download" },
      { key: "settings.connection.migrate", label: "Migrate to VPS" },
    ],
  },
  {
    id: "settings_gemini",
    label: "Settings → General → Gemini API",
    permissions: [
      { key: "settings.gemini.view", label: "View" },
      { key: "settings.gemini.add", label: "Add API key" },
      { key: "settings.gemini.edit", label: "Edit keys / models" },
      { key: "settings.gemini.delete", label: "Delete API key" },
    ],
  },
  {
    id: "settings_prompts",
    label: "Settings → General → AI Prompts",
    permissions: [
      { key: "settings.prompts.view", label: "View" },
      { key: "settings.prompts.edit", label: "Edit prompts" },
      { key: "settings.prompts.reset", label: "Reset to default" },
    ],
  },
  {
    id: "settings_subjects",
    label: "Settings → General → Subjects",
    permissions: [
      { key: "settings.subjects.view", label: "View" },
      { key: "settings.subjects.add", label: "Add" },
      { key: "settings.subjects.edit", label: "Edit" },
      { key: "settings.subjects.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_systems",
    label: "Settings → General → Systems",
    permissions: [
      { key: "settings.systems.view", label: "View" },
      { key: "settings.systems.add", label: "Add" },
      { key: "settings.systems.edit", label: "Edit" },
      { key: "settings.systems.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_chapters",
    label: "Settings → General → Chapters",
    permissions: [
      { key: "settings.chapters.view", label: "View" },
      { key: "settings.chapters.add", label: "Add" },
      { key: "settings.chapters.edit", label: "Edit" },
      { key: "settings.chapters.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_topics",
    label: "Settings → General → Topics",
    permissions: [
      { key: "settings.topics.view", label: "View" },
      { key: "settings.topics.add", label: "Add" },
      { key: "settings.topics.edit", label: "Edit" },
      { key: "settings.topics.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_concepts",
    label: "Settings → General → Concepts",
    permissions: [
      { key: "settings.concepts.view", label: "View" },
      { key: "settings.concepts.add", label: "Add" },
      { key: "settings.concepts.edit", label: "Edit" },
      { key: "settings.concepts.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_boards",
    label: "Settings → General → Boards",
    permissions: [
      { key: "settings.boards.view", label: "View" },
      { key: "settings.boards.add", label: "Add" },
      { key: "settings.boards.edit", label: "Edit" },
      { key: "settings.boards.delete", label: "Delete" },
    ],
  },
  {
    id: "settings_access",
    label: "Settings → General → Access (manage users)",
    permissions: [{ key: "settings.access.manage", label: "Manage access accounts" }],
  },
  {
    id: "settings_appearance",
    label: "Settings → Appearance",
    permissions: [
      { key: "settings.appearance.view", label: "View" },
      { key: "settings.appearance.edit", label: "Edit & save" },
      { key: "settings.appearance.reset", label: "Reset defaults" },
    ],
  },
  {
    id: "user_area",
    label: "User area (student)",
    permissions: [
      { key: "user.my_progress.view", label: "My progress" },
      { key: "user.my_suggestions.view", label: "My suggestions" },
      { key: "user.my_exams.view", label: "My exams" },
      { key: "user.study.view", label: "Study / concept learn" },
      { key: "user.practice.view", label: "Practice sessions" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export function normalizePermissions(raw) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(ALL_PERMISSION_KEYS);
  return [...new Set(raw.filter((k) => typeof k === "string" && allowed.has(k.trim())).map((k) => k.trim()))];
}

export function userHasPermission(user, key) {
  if (!user || !key) return false;
  if (user.role === "admin") return true;
  const perms = normalizePermissions(user.permissions);
  return perms.includes(key);
}

export function userHasAnyPermission(user, keys) {
  if (!user || !Array.isArray(keys) || keys.length === 0) return false;
  if (user.role === "admin") return true;
  const perms = new Set(normalizePermissions(user.permissions));
  return keys.some((k) => typeof k === "string" && perms.has(k));
}

export function userCanAccessAdmin(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "staff") return false;
  return normalizePermissions(user.permissions).length > 0;
}

export function permissionsForResponse(user) {
  if (!user) return [];
  if (user.role === "admin") return ALL_PERMISSION_KEYS;
  return normalizePermissions(user.permissions);
}
