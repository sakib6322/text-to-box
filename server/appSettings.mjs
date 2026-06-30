import {
  EXTRACT_QUESTIONS_PROMPT_KEY,
  getDefaultExtractQuestionsPrompt,
} from "./promptDefaults.mjs";

export async function getAppSetting(db, key) {
  const { data, error } = await db
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getExtractQuestionsPrompt(db) {
  const row = await getAppSetting(db, EXTRACT_QUESTIONS_PROMPT_KEY);
  const trimmed = typeof row?.value === "string" ? row.value.trim() : "";
  if (trimmed) {
    return { prompt: trimmed, source: "database", updated_at: row.updated_at ?? null };
  }
  return {
    prompt: getDefaultExtractQuestionsPrompt(),
    source: "default",
    updated_at: null,
  };
}

export async function saveExtractQuestionsPrompt(db, prompt) {
  const value = String(prompt ?? "").trim();
  if (!value) throw new Error("Prompt cannot be empty");
  const { data, error } = await db
    .from("app_settings")
    .upsert(
      { key: EXTRACT_QUESTIONS_PROMPT_KEY, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();
  if (error) throw error;
  return { prompt: data.value, source: "database", updated_at: data.updated_at };
}

export async function resetExtractQuestionsPrompt(db) {
  const { error } = await db.from("app_settings").delete().eq("key", EXTRACT_QUESTIONS_PROMPT_KEY);
  if (error) throw error;
  return {
    prompt: getDefaultExtractQuestionsPrompt(),
    source: "default",
    updated_at: null,
  };
}
