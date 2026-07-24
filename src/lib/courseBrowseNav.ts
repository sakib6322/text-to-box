export type CourseBrowseStep = "subjects" | "systems" | "chapters" | "topics";

export type CourseBrowseNavState = {
  step: CourseBrowseStep;
  subjectId?: string | null;
  systemId?: string | null;
  chapterId?: string | null;
};

export type CourseTopicPath = {
  topic_id?: string;
  subject_id?: string | null;
  system_id?: string | null;
  chapter_id?: string | null;
  path?: string;
};

export const COURSE_BROWSE_NAV_KEY = "courseBrowseNav";

const SESSION_NAV_PREFIX = "pgdiary:courseBrowseNav:";

export function persistCourseBrowseNav(courseId: string, nav: CourseBrowseNavState | null | undefined) {
  if (!courseId || typeof sessionStorage === "undefined") return;
  try {
    if (!nav) {
      sessionStorage.removeItem(`${SESSION_NAV_PREFIX}${courseId}`);
      return;
    }
    sessionStorage.setItem(`${SESSION_NAV_PREFIX}${courseId}`, JSON.stringify(nav));
  } catch {
    /* private mode */
  }
}

export function readPersistedCourseBrowseNav(courseId: string): CourseBrowseNavState | null {
  if (!courseId || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_NAV_PREFIX}${courseId}`);
    if (!raw) return null;
    return readCourseBrowseNav({ [COURSE_BROWSE_NAV_KEY]: JSON.parse(raw) as CourseBrowseNavState });
  } catch {
    return null;
  }
}

export function readCourseBrowseNav(state: unknown): CourseBrowseNavState | null {
  if (!state || typeof state !== "object") return null;
  const raw = (state as Record<string, unknown>)[COURSE_BROWSE_NAV_KEY];
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const step = n.step;
  if (step !== "subjects" && step !== "systems" && step !== "chapters" && step !== "topics") return null;
  return {
    step,
    subjectId: typeof n.subjectId === "string" ? n.subjectId : null,
    systemId: typeof n.systemId === "string" ? n.systemId : null,
    chapterId: typeof n.chapterId === "string" ? n.chapterId : null,
  };
}

export function withCourseBrowseNav(
  nav: CourseBrowseNavState | null | undefined,
): Record<string, CourseBrowseNavState> | undefined {
  if (!nav) return undefined;
  return { [COURSE_BROWSE_NAV_KEY]: nav };
}

export function courseBrowseNavFromTopicPath(path: CourseTopicPath | null | undefined): CourseBrowseNavState | null {
  if (!path?.chapter_id) return null;
  return {
    step: "topics",
    subjectId: path.subject_id ?? null,
    systemId: path.system_id ?? null,
    chapterId: path.chapter_id ?? null,
  };
}

/** Resolve where Topic Concepts / Learn should return in the browse hierarchy. */
export function resolveBrowseBackNav(args: {
  courseId?: string;
  locationState?: unknown;
  topicPath?: CourseTopicPath | null;
}): CourseBrowseNavState {
  const { courseId, locationState, topicPath } = args;
  return (
    readCourseBrowseNav(locationState) ??
    courseBrowseNavFromTopicPath(topicPath) ??
    (courseId ? readPersistedCourseBrowseNav(courseId) : null) ?? { step: "subjects" }
  );
}

export function courseBrowseLink(courseId: string, nav?: CourseBrowseNavState | null) {
  if (nav) persistCourseBrowseNav(courseId, nav);
  return {
    pathname: `/my-courses/${courseId}`,
    state: withCourseBrowseNav(nav),
  };
}

export function topicConceptsLink(
  courseId: string,
  topicId: string,
  nav?: CourseBrowseNavState | null,
) {
  if (nav) persistCourseBrowseNav(courseId, nav);
  return {
    pathname: `/my-courses/${courseId}/topics/${topicId}`,
    state: withCourseBrowseNav(nav),
  };
}

export function conceptLearnLink(
  courseId: string,
  conceptId: string,
  topicId?: string,
  nav?: CourseBrowseNavState | null,
) {
  if (nav && courseId) persistCourseBrowseNav(courseId, nav);
  const search = new URLSearchParams({ courseId });
  if (topicId) search.set("topicId", topicId);
  return {
    pathname: `/concept/${conceptId}/learn`,
    search: `?${search.toString()}`,
    state: withCourseBrowseNav(nav),
  };
}

export function conceptDetailsLink(
  courseId: string,
  conceptId: string,
  topicId?: string,
  nav?: CourseBrowseNavState | null,
) {
  if (nav && courseId) persistCourseBrowseNav(courseId, nav);
  const search = new URLSearchParams();
  if (courseId) search.set("courseId", courseId);
  if (topicId) search.set("topicId", topicId);
  const qs = search.toString();
  return {
    pathname: `/concept/${conceptId}/details`,
    search: qs ? `?${qs}` : undefined,
    state: withCourseBrowseNav(nav),
  };
}

export function courseFlowBackLink(args: {
  courseId?: string;
  topicId?: string;
  conceptId?: string;
  locationState?: unknown;
  topicPath?: CourseTopicPath | null;
}): { pathname: string; search?: string; state?: Record<string, CourseBrowseNavState> } | string {
  const { courseId, topicId, locationState, topicPath } = args;
  const nav = resolveBrowseBackNav({ courseId, locationState, topicPath });

  // From concept learn/details → topic concepts list
  if (courseId && topicId) {
    return topicConceptsLink(courseId, topicId, nav.step === "subjects" ? { ...nav, step: "topics" } : nav);
  }
  // From topic concepts → browse hierarchy (topics / chapter list, not always subjects)
  if (courseId) {
    const browseNav =
      nav.step === "subjects" && (nav.chapterId || topicPath?.chapter_id)
        ? {
            step: "topics" as const,
            subjectId: nav.subjectId ?? topicPath?.subject_id ?? null,
            systemId: nav.systemId ?? topicPath?.system_id ?? null,
            chapterId: nav.chapterId ?? topicPath?.chapter_id ?? null,
          }
        : nav;
    return courseBrowseLink(courseId, browseNav);
  }
  return "/my-suggestions";
}
