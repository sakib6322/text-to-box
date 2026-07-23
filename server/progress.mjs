/**
 * Progress Plan API routes.
 * @param {import('express').Express} app
 * @param {{ requireSupabase: Function, requireAuthUser: Function, requirePerm: Function }} deps
 */

import { loadProgressPlanSettings } from "./uiAppearance.mjs";

function averagePct(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function halfRollup(contentPct, completedSets, totalSets) {
  const contentHalf = contentPct * 0.5;
  const examHalf = totalSets > 0 ? (completedSets / totalSets) * 50 : 0;
  return Math.round(contentHalf + examHalf);
}

function tfItemAnswer(item) {
  const label = item.correct === "true" ? "True" : "False";
  const exp = String(item.explanation ?? "").trim();
  return exp ? `${label} — ${exp}` : label;
}

/** Derive Step 3 slides from exam-bank questions when admin self-QA cards are absent. */
function questionsToSelfQaItems(questions, conceptId) {
  const items = [];
  let sort = 0;
  for (const q of questions ?? []) {
    const mode = String(q.question_mode ?? "");
    const payload = q.payload && typeof q.payload === "object" ? q.payload : {};
    const stem = String(payload.stem ?? q.stem ?? "").trim();

    if (mode === "mcq") {
      const tf = Array.isArray(payload.trueFalse) ? payload.trueFalse : [];
      for (const item of tf) {
        const statement = String(item.statement ?? "").trim();
        if (!statement) continue;
        items.push({
          id: String(item.id ?? `bank-${q.id}-${sort}`),
          concept_id: conceptId,
          question: stem ? `${stem}\n${statement}` : statement,
          answer: tfItemAnswer(item),
          sort_order: sort++,
        });
      }
      if (!tf.length && stem) {
        items.push({
          id: `bank-${q.id}`,
          concept_id: conceptId,
          question: stem,
          answer: "Review this concept in your notes.",
          sort_order: sort++,
        });
      }
      continue;
    }

    if (mode === "sba") {
      if (!stem) continue;
      const options = Array.isArray(payload.options) ? payload.options : [];
      const idx = Number(payload.correctIndex);
      let answer = "";
      if (Number.isFinite(idx) && options[idx]) {
        answer = `${String.fromCharCode(97 + idx)}. ${options[idx]}`;
        const exp = String(payload.optionExplanations?.[idx] ?? "").trim();
        if (exp) answer += `\n${exp}`;
      }
      items.push({
        id: `bank-${q.id}`,
        concept_id: conceptId,
        question: stem,
        answer: answer || "See explanation in practice.",
        sort_order: sort++,
      });
    }
  }
  return items;
}

async function loadSelfQaItems(db, conceptId) {
  const { data: adminRows, error } = await db
    .from("concept_self_qa")
    .select("id, concept_id, question, answer, sort_order")
    .eq("concept_id", conceptId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (adminRows?.length) return adminRows;

  const { data: concept } = await db.from("concepts").select("id, title").eq("id", conceptId).maybeSingle();
  const title = String(concept?.title ?? "").trim();
  if (!title) return [];

  const { data: questions } = await db
    .from("questions")
    .select("id, question_mode, stem, payload")
    .eq("concept", title)
    .order("created_at", { ascending: true });

  return questionsToSelfQaItems(questions ?? [], conceptId);
}

function countSelfTestUnits(questions) {
  let n = 0;
  for (const q of questions ?? []) {
    const mode = String(q.question_mode ?? "");
    const payload = q.payload && typeof q.payload === "object" ? q.payload : {};
    if (mode === "mcq") {
      const tf = Array.isArray(payload.trueFalse) ? payload.trueFalse : [];
      n += tf.length || (String(payload.stem ?? q.stem ?? "").trim() ? 1 : 0);
    } else if (mode === "sba") {
      const opts = Array.isArray(payload.options) ? payload.options : [];
      n += opts.length && String(payload.stem ?? q.stem ?? "").trim() ? 1 : 0;
    }
  }
  return n;
}

async function loadSelfTestCountMap(db, concepts) {
  const map = new Map();
  const titleById = new Map(
    (concepts ?? []).map((c) => [c.id, String(c.title ?? c.concept ?? "").trim()]).filter(([, t]) => t),
  );
  const titles = [...new Set([...titleById.values()])];
  if (!titles.length) return map;

  const { data: questions } = await db
    .from("questions")
    .select("id, concept, question_mode, stem, payload")
    .in("concept", titles);

  const byTitle = new Map();
  for (const q of questions ?? []) {
    const t = String(q.concept ?? "").trim();
    if (!t) continue;
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t).push(q);
  }

  for (const c of concepts ?? []) {
    const title = titleById.get(c.id);
    if (!title) continue;
    const count = countSelfTestUnits(byTitle.get(title) ?? []);
    if (count > 0) map.set(c.id, count);
  }
  return map;
}

function conceptProgressPct(row, selfQaTotal, conceptSetsTotal, passedSetIds) {
  const STEP = 25;
  const clamp01 = (n) => (n <= 0 ? 0 : n >= 1 ? 1 : n);

  const slideTotal = Number(row.step1_slide_total ?? 0);
  const slideMax = Number(row.step1_max_slide_index ?? 0);
  const r1 = row.step1_completed_at
    ? 1
    : slideTotal > 0
      ? clamp01((Math.max(0, slideMax) + 1) / slideTotal)
      : 0;

  const studied = Array.isArray(row.studied_key_point_ids) ? row.studied_key_point_ids : [];
  const totalKp = Number(row.total_key_points ?? 0);
  const r2 = row.step2_completed_at
    ? 1
    : totalKp > 0
      ? clamp01(studied.length / totalKp)
      : 0;

  const seenQa = Array.isArray(row.self_qa_seen_ids) ? row.self_qa_seen_ids : [];
  const r3 = row.step3_completed_at
    ? 1
    : selfQaTotal > 0
      ? clamp01(seenQa.length / selfQaTotal)
      : 0;

  const r4 = row.step4_completed_at
    ? 1
    : conceptSetsTotal > 0
      ? clamp01(passedSetIds.length / conceptSetsTotal)
      : 0;

  return Math.min(100, Math.round((r1 + r2 + r3 + r4) * STEP));
}

export function registerProgressRoutes(app, { requireSupabase, requireAuthUser, requirePerm }) {
  async function isEnrolled(db, courseId, userId) {
    const { data } = await db
      .from("course_enrollments")
      .select("user_id")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();
    return !!data;
  }

  async function loadCourseTaxonomy(db, courseId) {
    const { data: mapped } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
    const topicIds = (mapped ?? []).map((r) => r.topic_id).filter(Boolean);
    if (!topicIds.length) return { topics: [], concepts: [], paths: [] };

    const { data: topics } = await db.from("topics").select("id, name, chapter_id").in("id", topicIds);
    const chapterIds = [...new Set((topics ?? []).map((t) => t.chapter_id).filter(Boolean))];
    const { data: chapters } = chapterIds.length
      ? await db.from("chapters").select("id, name, system_id").in("id", chapterIds)
      : { data: [] };
    const systemIds = [...new Set((chapters ?? []).map((c) => c.system_id).filter(Boolean))];
    const { data: systems } = systemIds.length
      ? await db.from("systems").select("id, name, subject_id").in("id", systemIds)
      : { data: [] };
    const subjectIds = [...new Set((systems ?? []).map((s) => s.subject_id).filter(Boolean))];
    const { data: subjects } = subjectIds.length
      ? await db.from("subjects").select("id, name").in("id", subjectIds)
      : { data: [] };

    const chMap = new Map((chapters ?? []).map((c) => [c.id, c]));
    const sysMap = new Map((systems ?? []).map((s) => [s.id, s]));
    const subMap = new Map((subjects ?? []).map((s) => [s.id, s]));

    const paths = (topics ?? []).map((t) => {
      const ch = chMap.get(t.chapter_id);
      const sys = ch ? sysMap.get(ch.system_id) : null;
      const sub = sys ? subMap.get(sys.subject_id) : null;
      return {
        topic_id: t.id,
        topic_name: t.name,
        chapter_id: ch?.id ?? null,
        system_id: sys?.id ?? null,
        subject_id: sub?.id ?? null,
      };
    });

    const { data: concepts } = await db.from("concepts").select("id, topic_id, title").in("topic_id", topicIds);
    return { topics: topics ?? [], concepts: concepts ?? [], paths };
  }

  app.get("/api/concepts/:conceptId/self-qa", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const conceptId = String(req.params.conceptId ?? "");
      const items = await loadSelfQaItems(db, conceptId);
      return res.json({ items });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/admin/concepts/:conceptId/self-qa", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.self_qa.manage"))) return;
      const conceptId = String(req.params.conceptId ?? "");
      const body = req.body ?? {};
      const { data, error } = await db
        .from("concept_self_qa")
        .insert({
          concept_id: conceptId,
          question: String(body.question ?? ""),
          answer: String(body.answer ?? ""),
          sort_order: Number(body.sort_order ?? 0),
        })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ item: data });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/self-qa/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.self_qa.manage"))) return;
      const body = req.body ?? {};
      const patch = {};
      if (body.question != null) patch.question = String(body.question);
      if (body.answer != null) patch.answer = String(body.answer);
      if (body.sort_order != null) patch.sort_order = Number(body.sort_order);
      const { data, error } = await db.from("concept_self_qa").update(patch).eq("id", String(req.params.id ?? "")).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ item: data });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/self-qa/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.self_qa.manage"))) return;
      const { error } = await db.from("concept_self_qa").delete().eq("id", String(req.params.id ?? ""));
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.put("/api/user/progress/concept/:conceptId/step", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const conceptId = String(req.params.conceptId ?? "");
      const body = req.body ?? {};
      const step = Number(body.step);
      if (![1, 2, 3, 4].includes(step)) return res.status(400).json({ error: "step must be 1-4" });

      const { data: existing } = await db
        .from("user_study_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("concept_id", conceptId)
        .maybeSingle();

      const now = new Date().toISOString();
      const row = {
        user_id: user.id,
        concept_id: conceptId,
        concept_name: String(body.concept_name ?? existing?.concept_name ?? ""),
        studied_key_point_ids: Array.isArray(body.studied_key_point_ids)
          ? body.studied_key_point_ids
          : (existing?.studied_key_point_ids ?? []),
        total_key_points: Number(body.total_key_points ?? existing?.total_key_points ?? 0),
        self_qa_seen_ids: Array.isArray(body.self_qa_seen_ids)
          ? body.self_qa_seen_ids
          : (existing?.self_qa_seen_ids ?? []),
        last_studied_at: now,
        step1_completed_at: existing?.step1_completed_at ?? null,
        step2_completed_at: existing?.step2_completed_at ?? null,
        step3_completed_at: existing?.step3_completed_at ?? null,
        step4_completed_at: existing?.step4_completed_at ?? null,
        step1_max_slide_index: Number(body.step1_max_slide_index ?? existing?.step1_max_slide_index ?? 0),
        step1_slide_total: Number(body.step1_slide_total ?? existing?.step1_slide_total ?? 0),
        resume_step: existing?.resume_step ?? null,
        resume_key_point_id: existing?.resume_key_point_id ?? null,
        resume_self_qa_id: existing?.resume_self_qa_id ?? null,
        resume_practice_set_id: existing?.resume_practice_set_id ?? null,
      };

      if (step === 1) row.step1_completed_at = now;
      if (step === 2) row.step2_completed_at = now;
      if (step === 3) {
        row.self_qa_seen_ids = Array.isArray(body.self_qa_seen_ids) ? body.self_qa_seen_ids : row.self_qa_seen_ids;
        row.step3_completed_at = now;
      }
      if (step === 4) row.step4_completed_at = now;
      if (Array.isArray(body.studied_key_point_ids)) row.studied_key_point_ids = body.studied_key_point_ids;
      if (Array.isArray(body.self_qa_seen_ids) && step !== 3) row.self_qa_seen_ids = body.self_qa_seen_ids;

      const { error } = await db.from("user_study_progress").upsert(row, { onConflict: "user_id,concept_id" });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, row });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/courses/:courseId/progress-sets", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.sets.manage"))) return;
      let q = db.from("progress_practice_sets").select("*").eq("course_id", String(req.params.courseId ?? "")).order("sort_order");
      if (req.query.scope_type) q = q.eq("scope_type", String(req.query.scope_type));
      if (req.query.set_kind) q = q.eq("set_kind", String(req.query.set_kind));
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ sets: data ?? [] });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/admin/courses/:courseId/progress-sets", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.sets.manage"))) return;
      const body = req.body ?? {};
      const { data, error } = await db
        .from("progress_practice_sets")
        .insert({
          course_id: String(req.params.courseId ?? ""),
          scope_type: String(body.scope_type ?? "concept"),
          scope_id: body.scope_id ?? null,
          set_kind: String(body.set_kind ?? "concept_practice"),
          title: String(body.title ?? ""),
          question_ids: Array.isArray(body.question_ids) ? body.question_ids : [],
          pass_percent: Number(body.pass_percent ?? 70),
          sort_order: Number(body.sort_order ?? 0),
          is_required: body.is_required !== false,
          publish_at: body.publish_at ?? null,
        })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ set: data });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/progress-sets/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.sets.manage"))) return;
      const body = req.body ?? {};
      const patch = { updated_at: new Date().toISOString() };
      for (const k of ["title", "scope_type", "scope_id", "set_kind", "question_ids", "pass_percent", "sort_order", "is_required", "publish_at"]) {
        if (body[k] !== undefined) patch[k] = body[k];
      }
      const { data, error } = await db.from("progress_practice_sets").update(patch).eq("id", String(req.params.id ?? "")).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ set: data });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/progress-sets/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      if (!(await requirePerm(req, res, db, "progress.sets.manage"))) return;
      const { error } = await db.from("progress_practice_sets").delete().eq("id", String(req.params.id ?? ""));
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses/:courseId/progress-sets", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.courseId ?? "");
      if (!(await isEnrolled(db, courseId, user.id))) return res.status(403).json({ error: "Not enrolled" });

      let q = db.from("progress_practice_sets").select("*").eq("course_id", courseId);
      if (req.query.scope_type) q = q.eq("scope_type", String(req.query.scope_type));
      if (req.query.scope_id) q = q.eq("scope_id", String(req.query.scope_id));
      if (req.query.set_kind) q = q.eq("set_kind", String(req.query.set_kind));
      const { data: sets, error } = await q.order("sort_order");
      if (error) return res.status(500).json({ error: error.message });

      const setIds = (sets ?? []).map((s) => s.id);
      const { data: attempts } = setIds.length
        ? await db.from("user_progress_set_attempts").select("set_id, passed, score, total, completed_at").eq("user_id", user.id).in("set_id", setIds)
        : { data: [] };
      const attemptMap = new Map((attempts ?? []).map((a) => [a.set_id, a]));

      const now = Date.now();
      const visible = (sets ?? []).filter((s) => {
        if (!s.publish_at) return true;
        if (s.set_kind === "exam_night_pyq") {
          const t = new Date(s.publish_at).getTime();
          return now >= t - 86400000 && now < t;
        }
        return new Date(s.publish_at).getTime() <= now;
      });

      return res.json({ sets: visible.map((s) => ({ ...s, attempt: attemptMap.get(s.id) ?? null })) });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/me/progress-sets/:setId/submit", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const setId = String(req.params.setId ?? "");
      const body = req.body ?? {};
      const score = Number(body.score ?? 0);
      const total = Number(body.total ?? 0);
      const wrongIds = Array.isArray(body.wrong_question_ids) ? body.wrong_question_ids : [];

      const { data: setRow } = await db.from("progress_practice_sets").select("*").eq("id", setId).maybeSingle();
      if (!setRow) return res.status(404).json({ error: "Set not found" });

      const passPct = Number(setRow.pass_percent ?? (await loadProgressPlanSettings(db)).defaultPassPercent ?? 70);
      const passed = total > 0 ? (score / total) * 100 >= passPct : false;
      const now = new Date().toISOString();

      const { data: attempt, error } = await db
        .from("user_progress_set_attempts")
        .insert({ user_id: user.id, set_id: setId, score, total, passed, answers: body.answers ?? null, completed_at: now })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });

      for (const qid of wrongIds) {
        const { data: ex } = await db.from("user_mistake_questions").select("wrong_count").eq("user_id", user.id).eq("question_id", qid).maybeSingle();
        await db.from("user_mistake_questions").upsert(
          {
            user_id: user.id,
            question_id: qid,
            course_id: setRow.course_id,
            source_set_id: setId,
            wrong_count: (ex?.wrong_count ?? 0) + 1,
            last_wrong_at: now,
            active: true,
          },
          { onConflict: "user_id,question_id" },
        );
      }

      if (passed && setRow.scope_type === "concept" && setRow.scope_id) {
        const { data: conceptSets } = await db
          .from("progress_practice_sets")
          .select("id")
          .eq("course_id", setRow.course_id)
          .eq("scope_type", "concept")
          .eq("scope_id", setRow.scope_id)
          .eq("set_kind", "concept_practice");
        const { data: passedAttempts } = await db
          .from("user_progress_set_attempts")
          .select("set_id")
          .eq("user_id", user.id)
          .eq("passed", true)
          .in("set_id", (conceptSets ?? []).map((s) => s.id));
        const passedIds = new Set((passedAttempts ?? []).map((a) => a.set_id));
        passedIds.add(setId);
        if ((conceptSets ?? []).length > 0 && passedIds.size >= (conceptSets ?? []).length) {
          const { data: prog } = await db.from("user_study_progress").select("*").eq("user_id", user.id).eq("concept_id", setRow.scope_id).maybeSingle();
          await db.from("user_study_progress").upsert(
            {
              user_id: user.id,
              concept_id: setRow.scope_id,
              concept_name: prog?.concept_name ?? "",
              studied_key_point_ids: prog?.studied_key_point_ids ?? [],
              total_key_points: prog?.total_key_points ?? 0,
              self_qa_seen_ids: prog?.self_qa_seen_ids ?? [],
              step1_completed_at: prog?.step1_completed_at,
              step2_completed_at: prog?.step2_completed_at,
              step3_completed_at: prog?.step3_completed_at,
              step4_completed_at: now,
              last_studied_at: now,
            },
            { onConflict: "user_id,concept_id" },
          );
        }
      }

      return res.json({ attempt, passed });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses/:courseId/progress", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.courseId ?? "");
      if (!(await isEnrolled(db, courseId, user.id))) return res.status(403).json({ error: "Not enrolled" });

      const { paths, concepts } = await loadCourseTaxonomy(db, courseId);
      const conceptIds = concepts.map((c) => c.id);

      const { data: studyRows } = conceptIds.length
        ? await db.from("user_study_progress").select("*").eq("user_id", user.id).in("concept_id", conceptIds)
        : { data: [] };
      const studyMap = new Map((studyRows ?? []).map((r) => [r.concept_id, r]));

      const qaTotalMap = await loadSelfTestCountMap(db, concepts);

      const { data: allSets } = await db.from("progress_practice_sets").select("*").eq("course_id", courseId);
      const { data: allAttempts } = await db.from("user_progress_set_attempts").select("set_id, passed").eq("user_id", user.id).eq("passed", true);
      const passedSetIds = new Set((allAttempts ?? []).map((a) => a.set_id));

      function setsFor(scopeType, scopeId, kind) {
        return (allSets ?? []).filter((s) => s.scope_type === scopeType && s.scope_id === scopeId && (!kind || s.set_kind === kind));
      }
      function passedCount(sets) {
        return sets.filter((s) => passedSetIds.has(s.id)).length;
      }

      const conceptPctMap = new Map();
      for (const c of concepts) {
        const row = studyMap.get(c.id) ?? {};
        const conceptSets = setsFor("concept", c.id, "concept_practice");
        const passedConcept = conceptSets.filter((s) => passedSetIds.has(s.id)).map((s) => s.id);
        conceptPctMap.set(c.id, conceptProgressPct(row, qaTotalMap.get(c.id) ?? 0, conceptSets.length, passedConcept));
      }

      const topicPcts = paths.map((p) => {
        const cIds = concepts.filter((c) => c.topic_id === p.topic_id).map((c) => c.id);
        return { ...p, pct: averagePct(cIds.map((id) => conceptPctMap.get(id) ?? 0)), concept_count: cIds.length };
      });

      const chapterIds = [...new Set(paths.map((p) => p.chapter_id).filter(Boolean))];
      const chapterPcts = chapterIds.map((chapterId) => {
        const topics = topicPcts.filter((t) => t.chapter_id === chapterId);
        const sets = setsFor("chapter", chapterId, "chapter_exam");
        return { chapter_id: chapterId, pct: halfRollup(averagePct(topics.map((t) => t.pct)), passedCount(sets), sets.length), topic_count: topics.length };
      });

      const systemIds = [...new Set(paths.map((p) => p.system_id).filter(Boolean))];
      const systemPcts = systemIds.map((systemId) => {
        const chapters = chapterPcts.filter((ch) => paths.find((p) => p.chapter_id === ch.chapter_id)?.system_id === systemId);
        const sets = setsFor("system", systemId, "system_exam");
        return { system_id: systemId, pct: halfRollup(averagePct(chapters.map((c) => c.pct)), passedCount(sets), sets.length), chapter_count: chapters.length };
      });

      const subjectIds = [...new Set(paths.map((p) => p.subject_id).filter(Boolean))];
      const subjectPcts = subjectIds.map((subjectId) => {
        const systems = systemPcts.filter((s) => paths.find((p) => p.system_id === s.system_id)?.subject_id === subjectId);
        const sets = setsFor("subject", subjectId, "subject_final");
        return { subject_id: subjectId, pct: halfRollup(averagePct(systems.map((s) => s.pct)), passedCount(sets), sets.length) };
      });

      const coursePct = averagePct(subjectPcts.map((s) => s.pct));
      const mockSets = (allSets ?? []).filter((s) => s.set_kind === "final_mock" && s.is_required);
      const mocksPassed = mockSets.filter((s) => passedSetIds.has(s.id)).length;
      const complete = subjectPcts.length > 0 && subjectPcts.every((s) => s.pct >= 100) && (mockSets.length === 0 || mocksPassed >= mockSets.length);

      const ppSettings = await loadProgressPlanSettings(db);
      const examNightMs = Math.max(1, Number(ppSettings.examNightHoursBefore ?? 24)) * 60 * 60 * 1000;
      const now = Date.now();
      const examNightVisible = ppSettings.showExamNightCard !== false && (allSets ?? []).some((s) => {
        if (s.set_kind !== "exam_night_pyq" || !s.publish_at) return false;
        const t = new Date(s.publish_at).getTime();
        return now >= t - examNightMs && now < t;
      });

      return res.json({
        course_id: courseId,
        course_pct: coursePct,
        course_complete: complete,
        exam_night_visible: examNightVisible,
        subjects: subjectPcts,
        systems: systemPcts,
        chapters: chapterPcts,
        topics: topicPcts,
        concepts: concepts.map((c) => ({ concept_id: c.id, topic_id: c.topic_id, pct: conceptPctMap.get(c.id) ?? 0 })),
        final_mocks: { total: mockSets.length, passed: mocksPassed },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/user/mistakes", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const { data, error } = await db.from("user_mistake_questions").select("*").eq("user_id", user.id).eq("active", true).order("last_wrong_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ mistakes: data ?? [], count: (data ?? []).length });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/user/mistakes", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const { error } = await db.from("user_mistake_questions").update({ active: false }).eq("user_id", user.id).eq("active", true);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/user/mistakes/review/submit", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const results = Array.isArray(req.body?.results) ? req.body.results : [];
      let cleared = 0;
      for (const r of results) {
        if (r.is_correct && r.question_id) {
          await db.from("user_mistake_questions").update({ active: false }).eq("user_id", user.id).eq("question_id", r.question_id);
          cleared += 1;
        }
      }
      const { data } = await db.from("user_mistake_questions").select("question_id").eq("user_id", user.id).eq("active", true);
      return res.json({ cleared, remaining: (data ?? []).length });
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });
}
