/** Effective Study & Practice Progress Plan — source of truth for Admin Dashboard. */

import type { PlanSection } from "@/lib/courseMappingPlan";

export const PROGRESS_PLAN_META = {
  product: "PG Diary",
  title: "Effective Study & Practice Progress Plan",
  version: "1.0",
  date: "July 2026",
  subtitle:
    "Concept-level 4-step learning loop, hierarchical progress rollup, admin-managed practice sets, Exam Night PYQ revision, and Review Mistakes — for medical PG preparation.",
};

export const PROGRESS_PLAN_SECTIONS: PlanSection[] = [
  {
    title: "1. Vision — কিভাবে effective study?",
    body: "Students follow a fixed study loop per concept. Progress rolls up automatically from Concept → Topic → Chapter → System → Subject → Course.",
    bullets: [
      "Each concept: Learn → Key Points → Question Yourself → Practice (25% each).",
      "Topic progress = average of all concepts in that topic.",
      "Chapter / System / Subject: 50% from child content + 50% from admin practice sets at that level.",
      "Course completes when all subjects are 100% and required final mock exams are passed.",
    ],
  },
  {
    title: "2. Concept 4-step flow (per concept)",
    subsections: [
      {
        title: "Step 1 — Concept Learning (25%)",
        bullets: [
          "Read concept detail paragraphs (ConceptDetailBody, Story Based Learning).",
          "Mark complete when user finishes reading / clicks Step complete.",
          "Already exists; integrated into guided stepper.",
        ],
      },
      {
        title: "Step 2 — Key Points (50%)",
        bullets: [
          "Locked until Step 1 is complete.",
          "Key points sorted by board importance (increment_count DESC, board mention_count DESC).",
          "Partial credit: studied KPs / total KPs × 25% within step 2 band.",
          "Complete when all key points studied.",
        ],
      },
      {
        title: "Step 3 — Question Yourself (75%)",
        bullets: [
          "Admin-authored one-liner Q&A per concept.",
          "Slide flow: question only → Next → answer below → Next → next question.",
          "Complete when all cards viewed.",
        ],
      },
      {
        title: "Step 4 — Practice Questions (100%)",
        bullets: [
          "Students do NOT pick questions — admin creates concept practice sets.",
          "Student completes all assigned sets (default pass threshold 70%).",
          "Wrong answers feed Review Mistakes bank.",
        ],
      },
    ],
  },
  {
    title: "3. Hierarchical progress formulas",
    subsections: [
      {
        title: "Topic",
        bullets: ["topicPct = average(conceptPct for all concepts in topic)"],
      },
      {
        title: "Chapter",
        bullets: [
          "chapterPct = 0.5 × average(topicPct in chapter) + 0.5 × (completedChapterSets / totalChapterSets) × 100",
        ],
      },
      {
        title: "System",
        bullets: [
          "systemPct = 0.5 × average(chapterPct in system) + 0.5 × (completedSystemSets / totalSystemSets) × 100",
        ],
      },
      {
        title: "Subject",
        bullets: [
          "subjectPct = 0.5 × average(systemPct in subject) + 0.5 × (completedSubjectSets / totalSubjectSets) × 100",
        ],
      },
      {
        title: "Course",
        bullets: [
          "coursePct = average(subjectPct across mapped subjects).",
          "courseComplete = all subjects 100% AND all required final_mock sets passed.",
        ],
      },
    ],
  },
  {
    title: "4. Admin-managed practice sets",
    bullets: [
      "Unified progress_practice_sets table: concept | chapter | system | subject | course scope.",
      "set_kind: concept_practice, chapter_exam, system_exam, subject_final, final_mock, exam_night_pyq.",
      "Admin builds sets from question bank; students only take published sets.",
      "Auto-fill high-yield, preview paper, duplicate template across chapters.",
    ],
  },
  {
    title: "5. Exam Night Topic (PYQ revision)",
    bullets: [
      "Unlocks within 24 hours before a scheduled Final Mock (Asia/Dhaka).",
      "Light PYQ revision sets (exam_night_pyq kind) — not a full mock.",
      "Card on course home: “Exam Night — Previous Year Questions”.",
      "Hides when mock window opens; mock takes priority.",
    ],
  },
  {
    title: "6. Review Mistakes",
    bullets: [
      "Profile entry: Review Mistakes with active count badge.",
      "Wrong answers in any practice/mock → upsert user_mistake_questions (active=true).",
      "Re-attempt correctly in Review Mistakes → remove from active list.",
      "Clear all option — backend persisted, not localStorage only.",
    ],
  },
  {
    title: "7. Data model",
    subsections: [
      {
        title: "user_study_progress (extended)",
        bullets: [
          "step1_completed_at, step2_completed_at, step3_completed_at, step4_completed_at",
          "studied_key_point_ids, self_qa_seen_ids",
        ],
      },
      {
        title: "concept_self_qa",
        bullets: ["id, concept_id, question, answer, sort_order"],
      },
      {
        title: "progress_practice_sets + user_progress_set_attempts",
        bullets: ["Admin sets + student attempts with pass/fail scoring"],
      },
      {
        title: "user_mistake_questions",
        bullets: ["user_id, question_id, course_id, wrong_count, active, last_wrong_at"],
      },
    ],
  },
  {
    title: "8. Permissions",
    bullets: [
      "progress.sets.manage — admin practice set CRUD",
      "progress.self_qa.manage — concept self-QA CRUD",
      "Student: user.my_progress.view, user.study.view, user.practice.view",
    ],
  },
  {
    title: "9. Out of scope (v1)",
    bullets: [
      "Student-created practice sets (removed by design).",
      "Spaced-repetition for mistakes.",
      "Payment / certificates on course complete.",
      "Auto-generating self-QA from AI.",
    ],
  },
];

export const CONCEPT_STEP_WEIGHT = 25;

export const CONCEPT_STEPS = [
  { id: 1, key: "learn", label: "Concept Learning", labelBn: "কনসেপ্ট শেখা" },
  { id: 2, key: "keypoints", label: "Key Points", labelBn: "Key Points" },
  { id: 3, key: "selfqa", label: "Question Yourself", labelBn: "নিজেকে পরীক্ষা" },
  { id: 4, key: "practice", label: "Practice Questions", labelBn: "Practice Questions" },
] as const;

export type ConceptStepKey = (typeof CONCEPT_STEPS)[number]["key"];

export type ProgressSetKind =
  | "concept_practice"
  | "chapter_exam"
  | "system_exam"
  | "subject_final"
  | "final_mock"
  | "exam_night_pyq";

export type ProgressScopeType = "concept" | "chapter" | "system" | "subject" | "course";
