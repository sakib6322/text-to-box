export const EXTRACT_QUESTIONS_PROMPT_KEY = "extract_questions_prompt";
export const EXTRACT_CONCEPT_PROMPT_KEY = "extract_concept_prompt";
export const EXTRACT_KEY_POINTS_PROMPT_KEY = "extract_key_points_prompt";
export const MATCHING_PROMPT_KEY = "matching_prompt";
export const MATCHING_VECTOR_ENABLED_KEY = "matching_vector_enabled";
export const MATCHING_AI_ENABLED_KEY = "matching_ai_enabled";

export function getDefaultExtractQuestionsPrompt() {
  return `You digitize medical exam papers from images or text.

TASK: Find every exam question (MCQ or SBA) and return them in "questions". Copy text EXACTLY as written — same words, punctuation, labels, numbers, and parenthetical tags. Do NOT paraphrase, translate, fix grammar, or summarize.

CLASSIFICATION (each question is either mcq OR sba, never both):

Use "mcq" when:
- The answer key lists True/False (or T/F) per option, e.g. "Answer: T F F T F" or "TFTFF"
- Each option a–e is marked true or false independently
- Wording implies multiple true/false statements under one stem

Use "sba" when:
- Exactly ONE best answer (single letter a–e, or one highlighted correct option)
- Classic single-best-answer multiple choice

MCQ fields:
- stem: exact stem line(s) including question number and tags like "(Residency March 2025)"
- mcq_statements: one item per option line, text copied exactly (keep "a)", "b)" prefixes if printed)
- correct: "true" or "false" matching the answer key for that line

SBA fields:
- stem: exact question text
- sba_options: each option line copied exactly (up to 5)
- sba_correct_index: 0 for a, 1 for b, … from the answer key

MULTIPLE QUESTIONS: If the image has Q04, Q05, etc., return one object per question in reading order.

If there are no exam questions, return "questions": [].

Do not invent options or answers not visible in the source.`;
}

export function getDefaultExtractConceptPrompt() {
  return `You are an expert Medical Professor. Analyze the uploaded medical textbook image and/or given source text.
First extract verbatim_text as close to the original wording as possible (plain text, no HTML).
Extract detail_summary as the main one-line definition (same-to-same wording when possible).
Extract detail_paragraphs as the teaching bullet paragraphs from the source (same-to-same, not rewritten as key points).
If the source has a comparison/classification table, populate detail_table with title, headers, and rows (cells per column).
Return the output STRICTLY matching the JSON schema. Do not include any extra text.`;
}

export function getDefaultExtractKeyPointsPrompt() {
  return `For high_yield_points ONLY: convert essay-like teaching text into exam-friendly study points or stems.
Do NOT put full MCQ/SBA exam questions (numbered stems with a–e options and an answer key) into high_yield_points.
Each point should be a concise, high-yield fact suitable for matching against a medical question bank.`;
}

export function getDefaultMatchingPrompt() {
  return `You are matching semantic similarity between one extracted study point and candidate key-points.
Return percentage similarity between 0 and 100 for each candidate.
Higher means stronger conceptual match.`;
}
