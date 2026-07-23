/**
 * Central route → module loaders for code-split pages.
 * Used by App routes and hover/idle prefetch so navigation feels instant.
 */

type Loader = () => Promise<unknown>;

const exact: Record<string, Loader> = {
  "/": () => import("@/pages/CourseLanding"),
  "/login": () => import("@/pages/Login"),
  "/builder": () => import("@/components/RoleBasedHome"),
  "/suggestions": () => import("@/pages/Suggestions"),
  "/my-suggestions": () => import("@/pages/MySuggestions"),
  "/my-courses": () => import("@/pages/MyCourses"),
  "/my-exams": () => import("@/pages/MyExams"),
  "/study/progress": () => import("@/pages/StudyProgressPage"),
  "/study/mistakes": () => import("@/pages/StudyMistakesPage"),
  "/profile": () => import("@/pages/MyProfile"),
  "/admin": () => import("@/pages/AdminDashboard"),
  "/admin/courses": () => import("@/pages/AdminCourses"),
  "/admin/question-bank/create-ai": () => import("@/pages/CreateQuestionAI"),
  "/admin/question-bank/questions": () => import("@/pages/AllQuestions"),
  "/admin/exam/create": () => import("@/pages/CreateExam"),
  "/admin/exam/schedules": () => import("@/pages/ExamSchedules"),
  "/admin/settings": () => import("@/pages/AdminSettings"),
  "/admin/settings/appearance": () => import("@/pages/AdminAppearance"),
  "/admin/practice-sheets": () => import("@/pages/AdminPlaceholder"),
  "/admin/students": () => import("@/pages/AdminPlaceholder"),
  "/admin/teachers": () => import("@/pages/AdminPlaceholder"),
  "/admin/organization": () => import("@/pages/AdminPlaceholder"),
  "/admin/academic/classes": () => import("@/pages/AdminPlaceholder"),
  "/admin/academic/subjects": () => import("@/pages/AdminPlaceholder"),
};

const patterns: { test: RegExp; load: Loader }[] = [
  { test: /^\/courses\/[^/]+$/, load: () => import("@/pages/CoursePublicDetail") },
  { test: /^\/my-courses\/[^/]+$/, load: () => import("@/pages/MyCourseBrowse") },
  { test: /^\/my-courses\/[^/]+\/topics\/[^/]+$/, load: () => import("@/pages/MyCourseTopic") },
  { test: /^\/my-exams\/take\/[^/]+$/, load: () => import("@/pages/TakeExam") },
  { test: /^\/my-exams\/result\/[^/]+$/, load: () => import("@/pages/ExamResult") },
  { test: /^\/concept\/[^/]+\/learn$/, load: () => import("@/pages/ConceptLearn") },
  { test: /^\/concept\/[^/]+\/details$/, load: () => import("@/pages/ConceptDetailPage") },
  { test: /^\/study\/[^/]+$/, load: () => import("@/pages/ConceptLearn") },
  { test: /^\/practice\/[^/]+\/setup$/, load: () => import("@/pages/PracticeSetup") },
  { test: /^\/practice\/session\/[^/]+$/, load: () => import("@/pages/PracticeTake") },
  { test: /^\/progress\/set\/[^/]+$/, load: () => import("@/pages/ProgressSetTake") },
  { test: /^\/admin\/courses\/[^/]+\/mapping$/, load: () => import("@/pages/AdminCourseMapping") },
  { test: /^\/admin\/courses\/[^/]+\/routine$/, load: () => import("@/pages/AdminCourseRoutine") },
  { test: /^\/admin\/courses\/[^/]+\/enrollments$/, load: () => import("@/pages/AdminCourseEnrollments") },
  { test: /^\/admin\/courses\/[^/]+\/progress-sets$/, load: () => import("@/pages/AdminProgressSets") },
];

const layouts: Record<string, Loader> = {
  app: () => import("@/layouts/AppSidebarLayout"),
  admin: () => import("@/layouts/AdminLayout"),
};

const warmed = new Set<string>();

function normalizePath(to: string): string {
  const raw = String(to || "").split("?")[0].split("#")[0].trim();
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

function resolveLoader(path: string): Loader | undefined {
  if (exact[path]) return exact[path];
  for (const p of patterns) {
    if (p.test.test(path)) return p.load;
  }
  return undefined;
}

/** Warm the JS chunk for a route (safe to call repeatedly). */
export function prefetchRoute(to: string): void {
  const path = normalizePath(to);
  if (warmed.has(path)) return;
  const load = resolveLoader(path);
  if (!load) return;
  warmed.add(path);
  void load().catch(() => {
    warmed.delete(path);
  });
}

/** Prefetch shell layouts used after login. */
export function prefetchAppShell(): void {
  if (!warmed.has("__layout_app")) {
    warmed.add("__layout_app");
    void layouts.app().catch(() => warmed.delete("__layout_app"));
  }
}

export function prefetchAdminShell(): void {
  if (!warmed.has("__layout_admin")) {
    warmed.add("__layout_admin");
    void layouts.admin().catch(() => warmed.delete("__layout_admin"));
  }
}

/** After first paint, warm a few likely-next routes (idle). */
export function prefetchLikelyRoutes(paths: string[]): void {
  const run = () => {
    for (const p of paths) prefetchRoute(p);
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 1200);
  }
}
