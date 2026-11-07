/** Catalog + types for Admin → Settings → Site updates briefs. */

export type SiteUpdatePriority = "low" | "normal" | "high" | "urgent";
export type SiteUpdateStatus = "open" | "saved" | "done" | "archived";

export type SiteUpdateOption = { id: string; label: string };
export type SiteUpdatePage = {
  id: string;
  label: string;
  path?: string;
  options: SiteUpdateOption[];
};

export type SiteUpdateItemAdvanced = {
  priority: SiteUpdatePriority;
  done: boolean;
  note: string;
};

export type SiteUpdateItem = {
  id: string;
  pageId: string;
  optionId: string | null;
  description: string;
  advanced: SiteUpdateItemAdvanced;
};

export type SiteUpdateSessionAdvanced = {
  priority: SiteUpdatePriority;
  visibility: "admin" | "shareable";
  tags: string[];
  assignee: string;
  dueAt: string | null;
  pinned: boolean;
  includePathsInShare: boolean;
  allowCopyExport: boolean;
};

export type SiteUpdateSession = {
  id: string;
  title: string;
  status: SiteUpdateStatus;
  shareEnabled: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  advanced: SiteUpdateSessionAdvanced;
  items: SiteUpdateItem[];
};

export type SiteUpdateStore = {
  sessions: SiteUpdateSession[];
};

export const SITE_UPDATE_PAGES: SiteUpdatePage[] = [
  {
    id: "settings-general",
    label: "Settings → General",
    path: "/admin/settings",
    options: [
      { id: "connection", label: "Connection / database" },
      { id: "gemini", label: "Gemini API keys" },
      { id: "prompts", label: "AI prompts" },
      { id: "taxonomy", label: "Taxonomy (subject → topic)" },
      { id: "concepts", label: "Concepts" },
      { id: "boards", label: "Boards" },
      { id: "access", label: "Access management" },
    ],
  },
  {
    id: "settings-appearance",
    label: "Settings → Appearance",
    path: "/admin/settings/appearance",
    options: [
      { id: "sidebar", label: "Sidebar / brand" },
      { id: "global-theme", label: "Global theme / density" },
      { id: "all-questions", label: "All questions paper" },
      { id: "correct-highlight", label: "Correct highlight" },
      { id: "wrong-highlight", label: "Wrong highlight" },
      { id: "story", label: "Story-based learning" },
      { id: "landing", label: "Landing page" },
      { id: "progress-plan", label: "Study & practice progress plan" },
      { id: "rich-editor", label: "Rich editor / images" },
    ],
  },
  {
    id: "practice-setup",
    label: "Practice → Setup",
    path: "/practice",
    options: [
      { id: "select-all", label: "Select all" },
      { id: "practice-all-mcq", label: "Practice all MCQ" },
      { id: "practice-all-sba", label: "Practice all SBA" },
      { id: "select-n", label: "Select N" },
      { id: "important", label: "Important ordering" },
    ],
  },
  {
    id: "practice-take",
    label: "Practice → Take session",
    path: "/practice/session",
    options: [
      { id: "nav-prev-next", label: "Prev / Next / Submit" },
      { id: "jump-board", label: "Jump board" },
      { id: "correct-wrong-colors", label: "Correct / wrong option colors" },
      { id: "skip-partial", label: "Skip / partial answers" },
      { id: "mobile-dock", label: "Mobile bottom board" },
    ],
  },
  {
    id: "question-bank-create",
    label: "Question bank → Create (AI)",
    path: "/admin/question-bank/create-ai",
    options: [
      { id: "extract", label: "AI extract" },
      { id: "bulk", label: "Bulk JSON / CSV" },
      { id: "editor", label: "Question editor / bullets" },
    ],
  },
  {
    id: "question-bank-all",
    label: "Question bank → All questions",
    path: "/admin/question-bank/questions",
    options: [
      { id: "filters", label: "Filters" },
      { id: "paper-look", label: "Paper look" },
      { id: "edit-delete", label: "Edit / delete" },
    ],
  },
  {
    id: "courses",
    label: "Courses",
    path: "/admin/courses",
    options: [
      { id: "create", label: "Create / publish" },
      { id: "mapping", label: "Mapping" },
      { id: "routine", label: "Routine" },
      { id: "enrollments", label: "Enrollments" },
      { id: "progress-sets", label: "Progress sets" },
    ],
  },
  {
    id: "exam",
    label: "Exam",
    path: "/admin/exam/create",
    options: [
      { id: "create", label: "Create exam" },
      { id: "schedules", label: "Schedules" },
    ],
  },
  {
    id: "suggestions",
    label: "Suggestions / Concept details",
    path: "/suggestions",
    options: [
      { id: "key-points", label: "Key points" },
      { id: "concept-details", label: "Concept details editor" },
      { id: "matching", label: "Matching" },
    ],
  },
  {
    id: "other",
    label: "Other / custom",
    options: [{ id: "custom", label: "Custom target" }],
  },
];

export function findSiteUpdatePage(pageId: string): SiteUpdatePage | undefined {
  return SITE_UPDATE_PAGES.find((p) => p.id === pageId);
}

export function findSiteUpdateOption(pageId: string, optionId: string | null): SiteUpdateOption | undefined {
  if (!optionId) return undefined;
  return findSiteUpdatePage(pageId)?.options.find((o) => o.id === optionId);
}

export function defaultItemAdvanced(): SiteUpdateItemAdvanced {
  return { priority: "normal", done: false, note: "" };
}

export function defaultSessionAdvanced(): SiteUpdateSessionAdvanced {
  return {
    priority: "normal",
    visibility: "admin",
    tags: [],
    assignee: "",
    dueAt: null,
    pinned: false,
    includePathsInShare: true,
    allowCopyExport: true,
  };
}

export function newSiteUpdateItem(partial?: Partial<SiteUpdateItem>): SiteUpdateItem {
  return {
    id: crypto.randomUUID(),
    pageId: partial?.pageId ?? SITE_UPDATE_PAGES[0]?.id ?? "other",
    optionId: partial?.optionId ?? null,
    description: partial?.description ?? "",
    advanced: { ...defaultItemAdvanced(), ...(partial?.advanced ?? {}) },
  };
}

export function newSiteUpdateSession(title = ""): SiteUpdateSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: title.trim() || `Update session ${new Date().toLocaleString()}`,
    status: "open",
    shareEnabled: false,
    shareToken: null,
    createdAt: now,
    updatedAt: now,
    advanced: defaultSessionAdvanced(),
    items: [],
  };
}

export function formatSessionExport(session: SiteUpdateSession): string {
  const lines: string[] = [
    `# ${session.title}`,
    `Status: ${session.status} · Priority: ${session.advanced.priority}`,
    session.advanced.tags.length ? `Tags: ${session.advanced.tags.join(", ")}` : "",
    session.advanced.assignee ? `Assignee: ${session.advanced.assignee}` : "",
    "",
  ].filter(Boolean);

  session.items.forEach((item, i) => {
    const page = findSiteUpdatePage(item.pageId);
    const opt = findSiteUpdateOption(item.pageId, item.optionId);
    lines.push(`## ${i + 1}. ${page?.label ?? item.pageId}`);
    if (opt) lines.push(`Option: ${opt.label}`);
    if (session.advanced.includePathsInShare && page?.path) lines.push(`Path: ${page.path}`);
    lines.push(item.description.trim() || "(no description)");
    if (item.advanced.note.trim()) lines.push(`Note: ${item.advanced.note.trim()}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}
