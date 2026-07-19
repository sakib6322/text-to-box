/** Professional Course Mapping Module plan — source of truth for Admin Dashboard + PDF. */

export type PlanSection = {
  title: string;
  body?: string;
  bullets?: string[];
  subsections?: { title: string; bullets: string[] }[];
};

export const COURSE_PLAN_META = {
  product: "PG Diary",
  title: "Course Mapping Module — Product & Implementation Plan",
  version: "1.0",
  date: "July 2026",
  subtitle:
    "Pre-login course catalog, syllabus mapping, date-based content unlock, dual enrollment, and board-count importance for medical PG preparation.",
};

export const COURSE_PLAN_SECTIONS: PlanSection[] = [
  {
    title: "1. Vision",
    body: "Students discover a course before login, enroll (themselves or via admin), and then only see syllabus-mapped content unlocked by a published date routine — never the entire bank at once.",
    bullets: [
      "Public landing with unique PG Diary branding (course card grid workflow).",
      "Admin builds courses, maps topics from the existing taxonomy, and schedules system unlocks by date.",
      "Importance stars (1–3) reflect board / increment pressure on topics so high-yield areas stand out.",
    ],
  },
  {
    title: "2. Existing foundation (reuse)",
    bullets: [
      "Taxonomy already exists: Subject → System → Chapter → Topic.",
      "Concepts link via topic_id; key points carry increment_count and board links.",
      "Roles: admin / staff / user with fine-grained permissions.",
      "No prior course, enrollment, or routine tables — this module adds them.",
    ],
  },
  {
    title: "3. Locked product decisions",
    bullets: [
      "Enrollment model: self-enroll + admin assign (dual).",
      "Ship scope: landing, admin CRUD/mapping/routine/enrollments, and student browse — together.",
      "Mapping grain: Topics (e.g. Facial Nerve under Face → Head & Neck → Anatomy).",
      "Unlock grain: Systems per publish date (one or more systems per day; all mapped topics under that system unlock).",
      "Importance: sum of key_point.increment_count under the topic → 0 / ★ / ★★ / ★★★.",
    ],
  },
  {
    title: "4. Data model",
    subsections: [
      {
        title: "courses",
        bullets: [
          "name, slug (unique), description, status (draft | published), sort_order, timestamps.",
        ],
      },
      {
        title: "course_topics",
        bullets: ["course_id + topic_id (syllabus checklist). Remove-from-course supported."],
      },
      {
        title: "course_routines",
        bullets: [
          "course_id + system_id + publish_date (Asia/Dhaka).",
          "One system scheduled once per course; multiple systems may share a date.",
        ],
      },
      {
        title: "course_enrollments",
        bullets: ["course_id + user_id, source (self | admin), enrolled_at."],
      },
    ],
  },
  {
    title: "5. Student visibility rules (server-enforced)",
    bullets: [
      "Course must be published.",
      "User must be enrolled.",
      "Concept topic must be in course_topics.",
      "Topic’s system must have publish_date ≤ today (Asia/Dhaka).",
      "Future routine rows show as locked (“Unlocks on …”) without content.",
    ],
  },
  {
    title: "6. Admin workflows",
    subsections: [
      {
        title: "Course Management",
        bullets: [
          "Admin → Courses → Add Course (e.g. FCPS Part-I Pediatrics, Medicine, Residency…).",
          "Draft vs Publish; edit name, description, order.",
        ],
      },
      {
        title: "Course Mapping",
        bullets: [
          "Navigate Subject → System → Chapter → multi-select topics.",
          "Select all topics in the current chapter; remove mapped topics anytime.",
          "Mapped topics determine which content can ever appear for that course.",
        ],
      },
      {
        title: "Routine",
        bullets: [
          "Example: 27-Jul-26 → Anatomy / Head & Neck; 30-Jul-26 → Pathology / Inflammation.",
          "On that date the full mapped topic set under those systems unlocks for enrolled students.",
        ],
      },
      {
        title: "Enrollments",
        bullets: ["Admin assign / remove students; students may also self-enroll from the catalog."],
      },
    ],
  },
  {
    title: "7. Student & public experience",
    bullets: [
      "Public / — PG Diary course catalog (hero brand + card grid + Login / Register).",
      "Public /courses/:slug — course summary and Enroll CTA.",
      "/my-courses — enrolled courses; browse unlocked systems/topics with stars.",
      "Topic open → existing concept study / details flows.",
      "Concept Builder moves to /builder for staff with home.view.",
    ],
  },
  {
    title: "8. Permissions",
    bullets: [
      "Admin: courses.view / add / edit / delete, courses.mapping.edit, courses.routine.edit, courses.enroll.manage.",
      "Student: user.courses.view, user.courses.enroll (included for role=user).",
    ],
  },
  {
    title: "9. Implementation checklist",
    bullets: [
      "Migration + REST APIs (public, me, admin).",
      "Admin UI: list, mapping, routine, enrollments + sidebar.",
      "Public landing + routing updates.",
      "My Courses date-gated browse + importance stars.",
      "Verify: map → schedule past/future → self + admin enroll → lock/unlock.",
    ],
  },
  {
    title: "10. Explicitly out of scope",
    bullets: [
      "Payment / gateway.",
      "Batches or sections under a course.",
      "Changing Settings taxonomy CRUD.",
      "Auto-generating routines from a PDF syllabus.",
    ],
  },
];

export function slugifyCourseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
