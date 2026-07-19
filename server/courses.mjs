/**
 * Course Mapping Module API routes.
 * @param {import('express').Express} app
 * @param {{
 *   requireSupabase: Function,
 *   requireAuthUser: Function,
 *   requirePerm: Function,
 * }} deps
 */
export function registerCourseRoutes(app, { requireSupabase, requireAuthUser, requirePerm }) {
  const todayDhaka = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(),
    );

  const slugify = (name) =>
    String(name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `course-${Date.now()}`;

  const starsFromCount = (n) => {
    const v = Math.max(0, Number(n) || 0);
    if (v <= 0) return 0;
    if (v <= 5) return 1;
    if (v <= 20) return 2;
    return 3;
  };

  async function uniqueSlug(db, base, excludeId = null) {
    let slug = slugify(base);
    let i = 0;
    for (;;) {
      const candidate = i === 0 ? slug : `${slug}-${i}`;
      let q = db.from("courses").select("id").eq("slug", candidate).maybeSingle();
      const { data } = await q;
      if (!data || (excludeId && data.id === excludeId)) return candidate;
      i += 1;
      if (i > 50) return `${slug}-${Date.now()}`;
    }
  }

  async function topicImportanceMap(db, topicIds) {
    const map = new Map();
    for (const id of topicIds) map.set(id, { boardScore: 0, stars: 0, conceptCount: 0 });
    if (!topicIds.length) return map;

    const { data: concepts } = await db.from("concepts").select("id, topic_id").in("topic_id", topicIds);
    const conceptIds = (concepts ?? []).map((c) => c.id).filter(Boolean);
    const topicByConcept = new Map((concepts ?? []).map((c) => [c.id, c.topic_id]));
    for (const c of concepts ?? []) {
      const row = map.get(c.topic_id);
      if (row) row.conceptCount += 1;
    }
    if (!conceptIds.length) return map;

    const { data: kps } = await db.from("key_points").select("concept_id, increment_count").in("concept_id", conceptIds);
    for (const kp of kps ?? []) {
      const tid = topicByConcept.get(kp.concept_id);
      if (!tid) continue;
      const row = map.get(tid);
      if (!row) continue;
      row.boardScore += Math.max(0, Number(kp.increment_count ?? 0));
    }
    for (const [, row] of map) row.stars = starsFromCount(row.boardScore);
    return map;
  }

  async function resolveTopicPaths(db, topicIds) {
    if (!topicIds.length) return [];
    const { data: topics } = await db
      .from("topics")
      .select("id, name, chapter_id, sort_order")
      .in("id", topicIds);
    const chapterIds = [...new Set((topics ?? []).map((t) => t.chapter_id).filter(Boolean))];
    const { data: chapters } = chapterIds.length
      ? await db.from("chapters").select("id, name, system_id, sort_order").in("id", chapterIds)
      : { data: [] };
    const systemIds = [...new Set((chapters ?? []).map((c) => c.system_id).filter(Boolean))];
    const { data: systems } = systemIds.length
      ? await db.from("systems").select("id, name, subject_id, sort_order").in("id", systemIds)
      : { data: [] };
    const subjectIds = [...new Set((systems ?? []).map((s) => s.subject_id).filter(Boolean))];
    const { data: subjects } = subjectIds.length
      ? await db.from("subjects").select("id, name, sort_order").in("id", subjectIds)
      : { data: [] };

    const chMap = new Map((chapters ?? []).map((c) => [c.id, c]));
    const sysMap = new Map((systems ?? []).map((s) => [s.id, s]));
    const subMap = new Map((subjects ?? []).map((s) => [s.id, s]));

    return (topics ?? []).map((t) => {
      const ch = chMap.get(t.chapter_id);
      const sys = ch ? sysMap.get(ch.system_id) : null;
      const sub = sys ? subMap.get(sys.subject_id) : null;
      return {
        topic_id: t.id,
        topic_name: t.name,
        chapter_id: ch?.id ?? null,
        chapter_name: ch?.name ?? null,
        system_id: sys?.id ?? null,
        system_name: sys?.name ?? null,
        subject_id: sub?.id ?? null,
        subject_name: sub?.name ?? null,
        path: [sub?.name, sys?.name, ch?.name, t.name].filter(Boolean).join(" › "),
      };
    });
  }

  async function isEnrolled(db, courseId, userId) {
    const { data } = await db
      .from("course_enrollments")
      .select("user_id, status")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();
    return !!data;
  }

  // ——— Public ———
  app.get("/api/courses", async (_req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const { data, error } = await db
        .from("courses")
        .select("id, name, slug, description, status, sort_order")
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      const courses = data ?? [];
      const courseIds = courses.map((c) => c.id);
      if (!courseIds.length) return res.json({ courses: [] });

      const { data: routines, error: rErr } = await db
        .from("course_routines")
        .select("id, course_id, system_id, publish_date, label")
        .in("course_id", courseIds)
        .order("publish_date", { ascending: true });
      if (rErr) return res.status(500).json({ error: rErr.message });

      const systemIds = [...new Set((routines ?? []).map((r) => r.system_id))];
      const { data: systems } = systemIds.length
        ? await db.from("systems").select("id, name, subject_id").in("id", systemIds)
        : { data: [] };
      const subjectIds = [...new Set((systems ?? []).map((s) => s.subject_id).filter(Boolean))];
      const { data: subjects } = subjectIds.length
        ? await db.from("subjects").select("id, name").in("id", subjectIds)
        : { data: [] };
      const sysMap = new Map((systems ?? []).map((s) => [s.id, s]));
      const subMap = new Map((subjects ?? []).map((s) => [s.id, s]));

      const routinesByCourse = new Map();
      for (const r of routines ?? []) {
        const sys = sysMap.get(r.system_id);
        const sub = sys ? subMap.get(sys.subject_id) : null;
        const row = {
          id: r.id,
          publish_date: r.publish_date,
          label: r.label ?? "",
          system_id: r.system_id,
          system_name: sys?.name ?? null,
          subject_name: sub?.name ?? null,
        };
        const list = routinesByCourse.get(r.course_id) ?? [];
        list.push(row);
        routinesByCourse.set(r.course_id, list);
      }

      return res.json({
        courses: courses.map((c) => ({
          ...c,
          routines: routinesByCourse.get(c.id) ?? [],
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/courses/:slug", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const slug = String(req.params.slug ?? "").trim();
      const { data: course, error } = await db
        .from("courses")
        .select("id, name, slug, description, status, sort_order")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!course) return res.status(404).json({ error: "Course not found" });

      const { count: topicCount } = await db
        .from("course_topics")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id);
      const { count: routineCount } = await db
        .from("course_routines")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id);

      return res.json({
        course: {
          ...course,
          topic_count: topicCount ?? 0,
          routine_count: routineCount ?? 0,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // ——— Me (student) ———
  app.post("/api/courses/:id/enroll", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data: course } = await db
        .from("courses")
        .select("id, status, name")
        .eq("id", courseId)
        .maybeSingle();
      if (!course) return res.status(404).json({ error: "Course not found" });
      if (course.status !== "published") return res.status(400).json({ error: "Course is not published" });

      const { data: existing } = await db
        .from("course_enrollments")
        .select("status")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.status === "approved") {
        return res.json({ ok: true, course_id: courseId, status: "approved" });
      }
      if (existing?.status === "pending") {
        return res.json({ ok: true, course_id: courseId, status: "pending" });
      }

      const { error } = await db.from("course_enrollments").insert({
        course_id: courseId,
        user_id: user.id,
        source: "self",
        status: "pending",
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, course_id: courseId, status: "pending" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/courses/:id/enroll", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.id ?? "").trim();
      const { error } = await db
        .from("course_enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const { data: enrollments, error } = await db
        .from("course_enrollments")
        .select("course_id, source, enrolled_at, status")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (error) return res.status(500).json({ error: error.message });
      const ids = (enrollments ?? []).map((e) => e.course_id);
      if (!ids.length) return res.json({ courses: [] });
      const { data: courses } = await db
        .from("courses")
        .select("id, name, slug, description, status, sort_order")
        .in("id", ids)
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      const enMap = new Map((enrollments ?? []).map((e) => [e.course_id, e]));
      return res.json({
        courses: (courses ?? []).map((c) => ({
          ...c,
          enrollment: enMap.get(c.id) ?? null,
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses/:id/taxonomy", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data: course } = await db
        .from("courses")
        .select("id, name, slug, status")
        .eq("id", courseId)
        .maybeSingle();
      if (!course || course.status !== "published") return res.status(404).json({ error: "Course not found" });
      if (!(await isEnrolled(db, courseId, user.id))) return res.status(403).json({ error: "Not enrolled" });

      const { data: mapped } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
      const topicIds = (mapped ?? []).map((r) => r.topic_id);
      const paths = await resolveTopicPaths(db, topicIds);

      const subjectsMap = new Map();
      const systemsMap = new Map();
      const chaptersMap = new Map();
      const topicsOut = [];

      for (const p of paths) {
        if (p.subject_id && p.subject_name) {
          subjectsMap.set(p.subject_id, { id: p.subject_id, name: p.subject_name });
        }
        if (p.system_id && p.system_name) {
          systemsMap.set(p.system_id, {
            id: p.system_id,
            name: p.system_name,
            subject_id: p.subject_id,
          });
        }
        if (p.chapter_id && p.chapter_name) {
          chaptersMap.set(p.chapter_id, {
            id: p.chapter_id,
            name: p.chapter_name,
            system_id: p.system_id,
          });
        }
        topicsOut.push({
          id: p.topic_id,
          name: p.topic_name,
          chapter_id: p.chapter_id,
          path: p.path,
        });
      }

      const byName = (a, b) => String(a.name).localeCompare(String(b.name));
      return res.json({
        course: { id: course.id, name: course.name, slug: course.slug },
        subjects: [...subjectsMap.values()].sort(byName),
        systems: [...systemsMap.values()].sort(byName),
        chapters: [...chaptersMap.values()].sort(byName),
        topics: topicsOut.sort(byName),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses/:id/browse", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data: course } = await db
        .from("courses")
        .select("id, name, slug, description, status")
        .eq("id", courseId)
        .maybeSingle();
      if (!course || course.status !== "published") return res.status(404).json({ error: "Course not found" });
      if (!(await isEnrolled(db, courseId, user.id))) return res.status(403).json({ error: "Not enrolled" });

      const today = todayDhaka();
      const { data: mapped } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
      const topicIds = (mapped ?? []).map((r) => r.topic_id);
      const paths = await resolveTopicPaths(db, topicIds);
      const importance = await topicImportanceMap(db, topicIds);

      const { data: routines } = await db
        .from("course_routines")
        .select("id, system_id, publish_date, label")
        .eq("course_id", courseId)
        .order("publish_date", { ascending: true });

      const unlockedSystemIds = new Set(
        (routines ?? [])
          .filter((r) => String(r.publish_date) <= today)
          .map((r) => r.system_id),
      );

      const systemsMeta = new Map();
      for (const p of paths) {
        if (!p.system_id) continue;
        if (!systemsMeta.has(p.system_id)) {
          systemsMeta.set(p.system_id, {
            system_id: p.system_id,
            system_name: p.system_name,
            subject_id: p.subject_id,
            subject_name: p.subject_name,
          });
        }
      }

      const routineBySystem = new Map((routines ?? []).map((r) => [r.system_id, r]));

      const systems = [...systemsMeta.values()]
        .map((s) => {
          const routine = routineBySystem.get(s.system_id);
          const unlocked = unlockedSystemIds.has(s.system_id);
          const topics = paths
            .filter((p) => p.system_id === s.system_id)
            .map((p) => {
              const imp = importance.get(p.topic_id) ?? { boardScore: 0, stars: 0, conceptCount: 0 };
              return {
                ...p,
                stars: unlocked ? imp.stars : 0,
                board_score: unlocked ? imp.boardScore : 0,
                concept_count: unlocked ? imp.conceptCount : 0,
              };
            });
          return {
            ...s,
            unlocked,
            publish_date: routine?.publish_date ?? null,
            label: routine?.label ?? "",
            topics,
          };
        })
        .sort((a, b) => {
          const da = a.publish_date ? String(a.publish_date) : "9999";
          const db_ = b.publish_date ? String(b.publish_date) : "9999";
          if (da !== db_) return da.localeCompare(db_);
          return String(a.system_name).localeCompare(String(b.system_name));
        });

      return res.json({ course, today, systems });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/me/courses/:id/topics/:topicId/concepts", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      const user = await requireAuthUser(req, res, db);
      if (!user) return;
      const courseId = String(req.params.id ?? "").trim();
      const topicId = String(req.params.topicId ?? "").trim();

      const { data: course } = await db.from("courses").select("id, status").eq("id", courseId).maybeSingle();
      if (!course || course.status !== "published") return res.status(404).json({ error: "Course not found" });
      if (!(await isEnrolled(db, courseId, user.id))) return res.status(403).json({ error: "Not enrolled" });

      const { data: mapped } = await db
        .from("course_topics")
        .select("topic_id")
        .eq("course_id", courseId)
        .eq("topic_id", topicId)
        .maybeSingle();
      if (!mapped) return res.status(403).json({ error: "Topic not in course" });

      const paths = await resolveTopicPaths(db, [topicId]);
      const systemId = paths[0]?.system_id;
      if (!systemId) return res.status(400).json({ error: "Topic taxonomy incomplete" });

      const today = todayDhaka();
      const { data: routine } = await db
        .from("course_routines")
        .select("publish_date")
        .eq("course_id", courseId)
        .eq("system_id", systemId)
        .maybeSingle();
      if (!routine || String(routine.publish_date) > today) {
        return res.status(403).json({ error: "Topic not unlocked yet", unlocks_on: routine?.publish_date ?? null });
      }

      const { data: concepts, error } = await db
        .from("concepts")
        .select("id, title, subject, system, chapter, topic, topic_id")
        .eq("topic_id", topicId)
        .order("title", { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ concepts: concepts ?? [], path: paths[0] ?? null });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // ——— Admin ———
  app.get("/api/admin/courses", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.view"))) return;
      const { data, error } = await db
        .from("courses")
        .select("id, name, slug, description, status, sort_order, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) return res.status(500).json({ error: error.message });

      const ids = (data ?? []).map((c) => c.id);
      const topicCounts = new Map();
      const enrollCounts = new Map();
      if (ids.length) {
        const { data: trows } = await db.from("course_topics").select("course_id").in("course_id", ids);
        for (const r of trows ?? []) topicCounts.set(r.course_id, (topicCounts.get(r.course_id) ?? 0) + 1);
        const { data: erows } = await db.from("course_enrollments").select("course_id").in("course_id", ids);
        for (const r of erows ?? []) enrollCounts.set(r.course_id, (enrollCounts.get(r.course_id) ?? 0) + 1);
      }

      return res.json({
        courses: (data ?? []).map((c) => ({
          ...c,
          topic_count: topicCounts.get(c.id) ?? 0,
          enrollment_count: enrollCounts.get(c.id) ?? 0,
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/admin/courses", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.add"))) return;
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) return res.status(400).json({ error: "name required" });
      const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
      const status = req.body?.status === "published" ? "published" : "draft";
      const sort_order = Number.isFinite(Number(req.body?.sort_order)) ? Number(req.body.sort_order) : 0;
      const slug =
        typeof req.body?.slug === "string" && req.body.slug.trim()
          ? await uniqueSlug(db, req.body.slug.trim())
          : await uniqueSlug(db, name);

      const { data, error } = await db
        .from("courses")
        .insert({ name, slug, description, status, sort_order, updated_at: new Date().toISOString() })
        .select("*")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, course: data });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/courses/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.edit"))) return;
      const id = String(req.params.id ?? "").trim();
      const patch = { updated_at: new Date().toISOString() };
      if (typeof req.body?.name === "string") patch.name = req.body.name.trim();
      if (typeof req.body?.description === "string") patch.description = req.body.description.trim();
      if (req.body?.status === "draft" || req.body?.status === "published") patch.status = req.body.status;
      if (Number.isFinite(Number(req.body?.sort_order))) patch.sort_order = Number(req.body.sort_order);
      if (typeof req.body?.slug === "string" && req.body.slug.trim()) {
        patch.slug = await uniqueSlug(db, req.body.slug.trim(), id);
      }
      const { data, error } = await db.from("courses").update(patch).eq("id", id).select("*").single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, course: data });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/courses/:id", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.delete"))) return;
      const id = String(req.params.id ?? "").trim();
      const { error } = await db.from("courses").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/courses/:id/topics", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.view"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data: rows, error } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
      if (error) return res.status(500).json({ error: error.message });
      const topicIds = (rows ?? []).map((r) => r.topic_id);
      const topics = await resolveTopicPaths(db, topicIds);
      return res.json({ topic_ids: topicIds, topics });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.put("/api/admin/courses/:id/topics", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.mapping.edit"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const rawMode = typeof req.body?.mode === "string" ? req.body.mode : "replace";
      const mode =
        rawMode === "add" || rawMode === "remove" || rawMode === "add_chapters" ? rawMode : "replace";
      let topicIds = Array.isArray(req.body?.topic_ids)
        ? [...new Set(req.body.topic_ids.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))]
        : [];

      if (mode === "add_chapters") {
        const chapterIds = Array.isArray(req.body?.chapter_ids)
          ? [...new Set(req.body.chapter_ids.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))]
          : [];
        if (!chapterIds.length) return res.status(400).json({ error: "chapter_ids required" });
        const { data: topicRows, error: tErr } = await db.from("topics").select("id").in("chapter_id", chapterIds);
        if (tErr) return res.status(500).json({ error: tErr.message });
        topicIds = [...new Set((topicRows ?? []).map((t) => t.id).filter(Boolean))];
        if (topicIds.length) {
          const { error } = await db
            .from("course_topics")
            .upsert(
              topicIds.map((topic_id) => ({ course_id: courseId, topic_id })),
              { onConflict: "course_id,topic_id", ignoreDuplicates: true },
            );
          if (error) return res.status(500).json({ error: error.message });
        }
      } else if (mode === "replace") {
        await db.from("course_topics").delete().eq("course_id", courseId);
        if (topicIds.length) {
          const { error } = await db
            .from("course_topics")
            .insert(topicIds.map((topic_id) => ({ course_id: courseId, topic_id })));
          if (error) return res.status(500).json({ error: error.message });
        }
      } else if (mode === "add") {
        if (topicIds.length) {
          const { error } = await db
            .from("course_topics")
            .upsert(
              topicIds.map((topic_id) => ({ course_id: courseId, topic_id })),
              { onConflict: "course_id,topic_id", ignoreDuplicates: true },
            );
          if (error) return res.status(500).json({ error: error.message });
        }
      } else if (mode === "remove" && topicIds.length) {
        const { error } = await db
          .from("course_topics")
          .delete()
          .eq("course_id", courseId)
          .in("topic_id", topicIds);
        if (error) return res.status(500).json({ error: error.message });
      }

      const { data: rows } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
      const ids = (rows ?? []).map((r) => r.topic_id);
      const topics = await resolveTopicPaths(db, ids);
      return res.json({ ok: true, topic_ids: ids, topics });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/courses/:id/routines", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.view"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data, error } = await db
        .from("course_routines")
        .select("id, course_id, system_id, publish_date, label, created_at")
        .eq("course_id", courseId)
        .order("publish_date", { ascending: true });
      if (error) return res.status(500).json({ error: error.message });

      const systemIds = [...new Set((data ?? []).map((r) => r.system_id))];
      const { data: systems } = systemIds.length
        ? await db.from("systems").select("id, name, subject_id").in("id", systemIds)
        : { data: [] };
      const subjectIds = [...new Set((systems ?? []).map((s) => s.subject_id).filter(Boolean))];
      const { data: subjects } = subjectIds.length
        ? await db.from("subjects").select("id, name").in("id", subjectIds)
        : { data: [] };
      const sysMap = new Map((systems ?? []).map((s) => [s.id, s]));
      const subMap = new Map((subjects ?? []).map((s) => [s.id, s]));

      // topic counts per system for this course
      const { data: mapped } = await db.from("course_topics").select("topic_id").eq("course_id", courseId);
      const paths = await resolveTopicPaths(
        db,
        (mapped ?? []).map((r) => r.topic_id),
      );
      const countBySystem = new Map();
      for (const p of paths) {
        if (!p.system_id) continue;
        countBySystem.set(p.system_id, (countBySystem.get(p.system_id) ?? 0) + 1);
      }

      return res.json({
        routines: (data ?? []).map((r) => {
          const sys = sysMap.get(r.system_id);
          const sub = sys ? subMap.get(sys.subject_id) : null;
          return {
            ...r,
            system_name: sys?.name ?? null,
            subject_id: sys?.subject_id ?? null,
            subject_name: sub?.name ?? null,
            mapped_topic_count: countBySystem.get(r.system_id) ?? 0,
          };
        }),
        mappable_systems: [...new Map(paths.filter((p) => p.system_id).map((p) => [p.system_id, {
          system_id: p.system_id,
          system_name: p.system_name,
          subject_id: p.subject_id,
          subject_name: p.subject_name,
          mapped_topic_count: countBySystem.get(p.system_id) ?? 0,
        }])).values()],
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/admin/courses/:id/routines", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.routine.edit"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const systemId = typeof req.body?.system_id === "string" ? req.body.system_id.trim() : "";
      const publishDate = typeof req.body?.publish_date === "string" ? req.body.publish_date.trim() : "";
      const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
      if (!systemId || !publishDate) return res.status(400).json({ error: "system_id and publish_date required" });

      const { data, error } = await db
        .from("course_routines")
        .upsert(
          { course_id: courseId, system_id: systemId, publish_date: publishDate, label },
          { onConflict: "course_id,system_id" },
        )
        .select("*")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, routine: data });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/courses/:id/routines/:routineId", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.routine.edit"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const routineId = String(req.params.routineId ?? "").trim();
      if (!routineId) return res.status(400).json({ error: "routine id required" });

      const patch = {};
      if (typeof req.body?.publish_date === "string" && req.body.publish_date.trim()) {
        patch.publish_date = req.body.publish_date.trim();
      }
      if (typeof req.body?.label === "string") {
        patch.label = req.body.label.trim();
      }
      if (typeof req.body?.system_id === "string" && req.body.system_id.trim()) {
        patch.system_id = req.body.system_id.trim();
      }
      if (!Object.keys(patch).length) {
        return res.status(400).json({ error: "publish_date, label, or system_id required" });
      }

      const { data, error } = await db
        .from("course_routines")
        .update(patch)
        .eq("id", routineId)
        .eq("course_id", courseId)
        .select("*")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: "Routine not found" });
      return res.json({ ok: true, routine: data });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/courses/:id/routines/:routineId", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.routine.edit"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const routineId = String(req.params.routineId ?? "").trim();
      const { error } = await db
        .from("course_routines")
        .delete()
        .eq("id", routineId)
        .eq("course_id", courseId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/courses/:id/enrollments", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.enroll.manage"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const { data: rows, error } = await db
        .from("course_enrollments")
        .select("course_id, user_id, source, enrolled_at, status")
        .eq("course_id", courseId)
        .order("enrolled_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = (rows ?? []).map((r) => r.user_id);
      const { data: users } = userIds.length
        ? await db.from("app_users").select("id, email, display_name, role").in("id", userIds)
        : { data: [] };
      const uMap = new Map((users ?? []).map((u) => [u.id, u]));
      return res.json({
        enrollments: (rows ?? []).map((r) => ({
          ...r,
          status: r.status === "pending" ? "pending" : "approved",
          user: uMap.get(r.user_id) ?? null,
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/admin/courses/:id/enrollments", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.enroll.manage"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const userId = typeof req.body?.user_id === "string" ? req.body.user_id.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      let uid = userId;
      if (!uid && email) {
        const { data: u } = await db.from("app_users").select("id").eq("email", email).maybeSingle();
        if (!u) return res.status(404).json({ error: "User not found" });
        uid = u.id;
      }
      if (!uid) return res.status(400).json({ error: "user_id or email required" });

      const { error } = await db.from("course_enrollments").upsert(
        { course_id: courseId, user_id: uid, source: "admin", status: "approved" },
        { onConflict: "course_id,user_id" },
      );
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, user_id: uid, status: "approved" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.delete("/api/admin/courses/:id/enrollments/:userId", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.enroll.manage"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const userId = String(req.params.userId ?? "").trim();
      const { error } = await db
        .from("course_enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/courses/:id/enrollments/:userId", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.enroll.manage"))) return;
      const courseId = String(req.params.id ?? "").trim();
      const userId = String(req.params.userId ?? "").trim();
      const status = req.body?.status === "pending" ? "pending" : "approved";
      const { data, error } = await db
        .from("course_enrollments")
        .update({ status })
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .select("course_id, user_id, source, enrolled_at, status")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, enrollment: data });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/dashboard/stats", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "dashboard.view"))) return;

      const { data: courses, error: cErr } = await db.from("courses").select("id, status");
      if (cErr) return res.status(500).json({ error: cErr.message });
      const courseRows = courses ?? [];
      const published = courseRows.filter((c) => c.status === "published").length;
      const unpublished = courseRows.filter((c) => c.status !== "published").length;

      const { data: enrollments, error: eErr } = await db
        .from("course_enrollments")
        .select("status");
      if (eErr) return res.status(500).json({ error: eErr.message });
      const enRows = enrollments ?? [];
      const pending = enRows.filter((e) => e.status === "pending").length;
      const approved = enRows.filter((e) => e.status !== "pending").length;

      return res.json({
        courses: {
          total: courseRows.length,
          published,
          unpublished,
        },
        enrollments: {
          total: enRows.length,
          pending,
          approved,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.get("/api/admin/users/search", async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "courses.enroll.manage"))) return;
      const q = String(req.query.q ?? "").trim().toLowerCase();
      let query = db.from("app_users").select("id, email, display_name, role").order("email").limit(30);
      if (q) query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ users: data ?? [] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });
}
