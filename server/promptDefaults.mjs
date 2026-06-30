export const EXTRACT_QUESTIONS_PROMPT_KEY = "extract_questions_prompt";

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
