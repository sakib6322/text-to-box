import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BoardCheckboxGroup, type BoardOption } from "@/components/BoardCheckboxGroup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import { guardPermission } from "@/lib/permissionGuard";
import { useCan } from "@/components/Can";
import { cn } from "@/lib/utils";
import {
  draftFromExtracted,
  emptySbaExplanations,
  fetchGeneratedExplanations,
  mkQuestionId,
  type DraftQuestion,
  type ExtractedQuestion,
  type TfItem,
} from "@/lib/questionDrafts";

type ConceptCtx = {
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
};

type Props = {
  /** Existing key point id, or null until Add-box creates one */
  keyPointId: string | null;
  /** Default boards for newly extracted/manual questions (each question can override) */
  defaultBoardIds: string[];
  boardOptions: BoardOption[];
  concept: ConceptCtx;
  /** Reset drafts when the edited key point / dialog target changes */
  resetKey?: string;
  /** Create or sync key point content; returns id used as source_point_id */
  ensureKeyPointId: () => Promise<string>;
  /** Keep key-point board checkboxes in sync with the union of per-question boards */
  onKeyPointBoardsChange?: (boardIds: string[]) => void;
  /** After save — apply bumped board links + increment_count onto the key point row */
  onKeyPointLinked?: (update: {
    keyPointId: string;
    incrementCount: number;
    boardCountAdded: number;
    boardLinks: { board_id: string | null; name: string; mention_count: number }[];
  }) => void;
};

export function KeyPointQuestionsEditor({
  keyPointId,
  defaultBoardIds,
  boardOptions,
  concept,
  resetKey,
  ensureKeyPointId,
  onKeyPointBoardsChange,
  onKeyPointLinked,
}: Props) {
  const canSourceText = useCan("question_bank.create_ai.source_text");
  const canExtract = useCan("question_bank.create_ai.extract");
  const canAdd = useCan("question_bank.create_ai.add");
  const canEditAi = useCan("question_bank.create_ai.edit");

  const [open, setOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const sourceTextRef = useRef<HTMLTextAreaElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queuedQuestions, setQueuedQuestions] = useState<DraftQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionMode, setQuestionMode] = useState<"mcq" | "sba" | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [status, setStatus] = useState("published");
  const [marks, setMarks] = useState("1");
  const [mcqStem, setMcqStem] = useState("");
  const [tfItems, setTfItems] = useState<TfItem[]>([]);
  const [sbaStem, setSbaStem] = useState("");
  const [sbaOptions, setSbaOptions] = useState<[string, string, string, string, string]>(["", "", "", "", ""]);
  const [sbaOptionExplanations, setSbaOptionExplanations] = useState(emptySbaExplanations());
  const [sbaCorrect, setSbaCorrect] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const boardNamesFor = (ids: string[]) =>
    ids.map((id) => boardOptions.find((b) => b.id === id)?.name ?? "").filter(Boolean);

  useEffect(() => {
    setOpen(false);
    setSourceText("");
    setQueuedQuestions([]);
    setActiveQuestionIndex(0);
    setQuestionMode(null);
    setMcqStem("");
    setTfItems([]);
    setSbaStem("");
    setSbaOptions(["", "", "", "", ""]);
    setSbaOptionExplanations(emptySbaExplanations());
    setSbaCorrect(0);
    setSelectedBoardIds([...defaultBoardIds]);
    setSummary(null);
    setDifficulty("medium");
    setStatus("published");
    setMarks("1");
    // Reset only when dialog target (`resetKey`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const el = sourceTextRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [sourceText, open]);

  /** Union of boards across the queue (including the active form selection). */
  const syncKeyPointBoardsFromQuestions = (
    drafts: DraftQuestion[],
    activeIdx: number,
    activeBoardIds: string[],
  ) => {
    if (!onKeyPointBoardsChange) return;
    const union = new Set<string>();
    drafts.forEach((q, i) => {
      const ids = i === activeIdx ? activeBoardIds : q.boardIds ?? [];
      for (const id of ids) if (id) union.add(id);
    });
    // If nothing in queue yet but form has boards, still sync.
    if (drafts.length === 0) {
      for (const id of activeBoardIds) if (id) union.add(id);
    }
    onKeyPointBoardsChange([...union]);
  };

  const loadQuestionIntoForm = (q: DraftQuestion) => {
    setQuestionMode(q.questionMode);
    setDifficulty(q.metadata.difficulty || "medium");
    setStatus(q.metadata.status || "published");
    setMarks(String(q.metadata.marks ?? 1));
    setSelectedBoardIds([...(q.boardIds ?? [])]);
    if (q.questionMode === "mcq" && q.mcq) {
      setMcqStem(q.mcq.stem);
      setTfItems(
        q.mcq.trueFalse.length
          ? q.mcq.trueFalse.map((r) => ({ ...r, explanation: r.explanation ?? "" }))
          : [{ id: mkQuestionId(), statement: "", correct: "true", explanation: "" }],
      );
    } else if (q.questionMode === "sba" && q.sba) {
      setSbaStem(q.sba.stem);
      const opts: [string, string, string, string, string] = ["", "", "", "", ""];
      for (let i = 0; i < 5; i++) opts[i] = q.sba.options[i] ?? "";
      setSbaOptions(opts);
      const expls = emptySbaExplanations();
      for (let i = 0; i < 5; i++) expls[i] = q.sba.optionExplanations?.[i] ?? "";
      setSbaOptionExplanations(expls);
      setSbaCorrect(q.sba.correctIndex as 0 | 1 | 2 | 3 | 4);
    }
  };

  const setActiveBoardIds = (ids: string[]) => {
    setSelectedBoardIds(ids);
    setQueuedQuestions((prev) => {
      if (prev.length === 0) {
        syncKeyPointBoardsFromQuestions([], 0, ids);
        return prev;
      }
      const next = prev.map((q, i) =>
        i === activeQuestionIndex
          ? { ...q, boardIds: ids, metadata: { ...q.metadata, boards: boardNamesFor(ids) } }
          : q,
      );
      syncKeyPointBoardsFromQuestions(next, activeQuestionIndex, ids);
      return next;
    });
  };

  const buildCurrentDraftFromForm = (resolvedKeyPointId: string | null): DraftQuestion => {
    const existing = queuedQuestions[activeQuestionIndex];
    const marksNum = Number(marks) || 1;
    const boards = boardNamesFor(selectedBoardIds);
    return {
      id: existing?.id ?? mkQuestionId(),
      questionMode: questionMode as "mcq" | "sba",
      subject: concept.subject,
      system: concept.system,
      chapter: concept.chapter,
      topic: concept.topic,
      concept: concept.concept,
      boardIds: [...selectedBoardIds],
      metadata: {
        boards,
        importantSchools: [],
        sources: [],
        teachers: [],
        tags: [],
        difficulty,
        status,
        marks: marksNum,
      },
      mcq: questionMode === "mcq" ? { stem: mcqStem, trueFalse: tfItems } : null,
      sba:
        questionMode === "sba"
          ? {
              stem: sbaStem,
              options: sbaOptions,
              correctIndex: sbaCorrect,
              optionExplanations: [...sbaOptionExplanations],
            }
          : null,
      sourcePointId: resolvedKeyPointId ?? keyPointId,
    };
  };

  const updateActiveDraftFromForm = () => {
    if (queuedQuestions.length === 0 || !questionMode) return;
    const updated = buildCurrentDraftFromForm(keyPointId);
    setQueuedQuestions((prev) => prev.map((q, i) => (i === activeQuestionIndex ? updated : q)));
  };

  const questionsForSave = (resolvedKeyPointId: string): DraftQuestion[] => {
    const current = buildCurrentDraftFromForm(resolvedKeyPointId);
    if (queuedQuestions.length === 0) return questionMode ? [current] : [];
    return queuedQuestions.map((q, i) => {
      const draft = i === activeQuestionIndex ? current : q;
      const boardIds = Array.isArray(draft.boardIds) ? draft.boardIds : [];
      return {
        ...draft,
        sourcePointId: resolvedKeyPointId,
        subject: concept.subject,
        system: concept.system,
        chapter: concept.chapter,
        topic: concept.topic,
        concept: concept.concept,
        boardIds,
        metadata: { ...draft.metadata, boards: boardNamesFor(boardIds) },
      };
    });
  };

  const draftCtx = (boardIds: string[]) => ({
    subject: concept.subject,
    system: concept.system,
    chapter: concept.chapter,
    topic: concept.topic,
    concept: concept.concept,
    boardIds,
    boardNames: boardNamesFor(boardIds),
    sourcePointId: keyPointId,
  });

  const applyExtractedQuestions = async (questions: ExtractedQuestion[]) => {
    if (questions.length === 0) {
      setSummary(null);
      return;
    }
    const seedBoards = defaultBoardIds.length ? defaultBoardIds : [];
    let drafts = questions.map((q) => draftFromExtracted(q, draftCtx(seedBoards)));
    setGeneratingExplanations(true);
    try {
      drafts = await fetchGeneratedExplanations(drafts, concept.concept);
    } catch (e) {
      toast.warning(e instanceof Error ? e.message : "Could not auto-generate explanations");
    } finally {
      setGeneratingExplanations(false);
    }
    setQueuedQuestions(drafts);
    setActiveQuestionIndex(0);
    loadQuestionIntoForm(drafts[0]);
    syncKeyPointBoardsFromQuestions(drafts, 0, drafts[0]?.boardIds ?? []);
    const mcqCount = questions.filter((q) => q.question_type === "mcq").length;
    const sbaCount = questions.filter((q) => q.question_type === "sba").length;
    const parts = [];
    if (mcqCount) parts.push(`${mcqCount} MCQ`);
    if (sbaCount) parts.push(`${sbaCount} SBA`);
    setSummary(parts.join(", "));
  };

  const handleExtractQuestions = async () => {
    if (!guardPermission("question_bank.create_ai.extract")) return;
    if (!sourceText.trim()) return toast.error("Paste or type source text first");
    if (!canSourceText) return toast.error("No permission to use source text for extract");
    setExtracting(true);
    setSummary(null);
    try {
      // JSON body is more reliable than FormData for text-only extract.
      const resp = await fetch(apiUrl("/api/extract-questions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ input_text: sourceText.trim() }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        questions?: ExtractedQuestion[];
      };
      if (!resp.ok) throw new Error(data.error ?? "Question extract failed");
      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (questions.length === 0) {
        toast.warning("No questions found in source text");
        return;
      }
      await applyExtractedQuestions(questions);
      toast.success(`Extracted ${questions.length} question${questions.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Question extract failed");
    } finally {
      setExtracting(false);
    }
  };

  const generateExplanationsAi = async () => {
    if (!guardPermission("question_bank.create_ai.edit")) return;
    if (!questionMode) return toast.error("Select MCQ or SBA first");
    const stem = questionMode === "mcq" ? mcqStem.trim() : sbaStem.trim();
    if (!stem) return toast.error("Enter question stem first");
    setGeneratingExplanations(true);
    try {
      if (queuedQuestions.length > 0) updateActiveDraftFromForm();
      const resolvedId = keyPointId ?? "pending";
      const targets = questionsForSave(resolvedId).map((q) => ({ ...q, sourcePointId: keyPointId }));
      if (targets.length === 0) return toast.error("No questions to explain");
      const updated = await fetchGeneratedExplanations(targets, concept.concept);
      setQueuedQuestions(updated);
      const active = updated[activeQuestionIndex] ?? updated[0];
      if (active) loadQuestionIntoForm(active);
      toast.success("Explanations generated by AI");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Explanation generation failed");
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const addManualQuestion = (mode: "mcq" | "sba") => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    if (queuedQuestions.length > 0 && questionMode) updateActiveDraftFromForm();
    const marksNum = Number(marks) || 1;
    const boardIds = defaultBoardIds.length ? [...defaultBoardIds] : [...selectedBoardIds];
    const next: DraftQuestion = {
      id: mkQuestionId(),
      questionMode: mode,
      subject: concept.subject,
      system: concept.system,
      chapter: concept.chapter,
      topic: concept.topic,
      concept: concept.concept,
      boardIds,
      metadata: {
        boards: boardNamesFor(boardIds),
        importantSchools: [],
        sources: [],
        teachers: [],
        tags: [],
        difficulty,
        status,
        marks: marksNum,
      },
      mcq:
        mode === "mcq"
          ? {
              stem: "",
              trueFalse: [{ id: mkQuestionId(), statement: "", correct: "true", explanation: "" }],
            }
          : null,
      sba:
        mode === "sba"
          ? {
              stem: "",
              options: ["", "", "", "", ""],
              correctIndex: 0,
              optionExplanations: [...emptySbaExplanations()],
            }
          : null,
      sourcePointId: keyPointId,
    };
    setQueuedQuestions((prev) => {
      const merged = [...prev, next];
      setActiveQuestionIndex(merged.length - 1);
      syncKeyPointBoardsFromQuestions(merged, merged.length - 1, next.boardIds);
      return merged;
    });
    loadQuestionIntoForm(next);
    toast.success(`${mode.toUpperCase()} question added — set boards per question, then save`);
  };

  const selectQueuedQuestion = (index: number) => {
    if (index === activeQuestionIndex) return;
    updateActiveDraftFromForm();
    const q = queuedQuestions[index];
    if (!q) return;
    setActiveQuestionIndex(index);
    loadQuestionIntoForm(q);
  };

  const removeQueuedQuestion = (index: number) => {
    setQueuedQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setQuestionMode(null);
        setMcqStem("");
        setTfItems([]);
        setSbaStem("");
        setSbaOptions(["", "", "", "", ""]);
        setSbaOptionExplanations(emptySbaExplanations());
        setSelectedBoardIds([...defaultBoardIds]);
        setActiveQuestionIndex(0);
        syncKeyPointBoardsFromQuestions([], 0, defaultBoardIds);
        return next;
      }
      const newIdx = Math.min(index, next.length - 1);
      setActiveQuestionIndex(newIdx);
      queueMicrotask(() => {
        loadQuestionIntoForm(next[newIdx]!);
        syncKeyPointBoardsFromQuestions(next, newIdx, next[newIdx]?.boardIds ?? []);
      });
      return next;
    });
  };

  const saveQuestions = async () => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    if (!concept.concept.trim()) return toast.error("Concept title is required to save questions");
    setSaving(true);
    try {
      const resolvedId = await ensureKeyPointId();
      if (!resolvedId) throw new Error("Key point id missing");
      const toSave = questionsForSave(resolvedId);
      if (toSave.length === 0) return toast.error("Add or extract at least one question");
      for (const q of toSave) {
        if (q.questionMode === "mcq") {
          if (!q.mcq?.stem.trim()) return toast.error("MCQ stem is required");
          if (!q.mcq.trueFalse.some((r) => r.statement.trim())) return toast.error("Add at least one T/F statement");
        } else {
          if (!q.sba?.stem.trim()) return toast.error("SBA stem is required");
          if (!q.sba.options.some((o) => o.trim())) return toast.error("Add SBA options");
        }
      }
      const resp = await fetch(apiUrl("/api/save-question"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          source: { text: sourceText.trim() || null, hasImage: false },
          questions: toSave,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
        key_point_updates?: {
          id: string;
          increment_count: number;
          board_count_added: number;
          board_links: { board_id: string | null; name: string; mention_count: number }[];
        }[];
      };
      if (!resp.ok) throw new Error(data.error ?? "Save failed");
      const kpUpdate = data.key_point_updates?.find((u) => u.id === resolvedId) ?? data.key_point_updates?.[0];
      if (kpUpdate && onKeyPointLinked) {
        onKeyPointLinked({
          keyPointId: kpUpdate.id,
          incrementCount: kpUpdate.increment_count,
          boardCountAdded: kpUpdate.board_count_added,
          boardLinks: kpUpdate.board_links ?? [],
        });
      }
      const bumpMsg =
        kpUpdate && kpUpdate.board_count_added > 0
          ? ` · key point boards +${kpUpdate.board_count_added}`
          : "";
      toast.success(
        `${data.count ?? toSave.length} question(s) saved · linked to this key point${bumpMsg} · visible in All Questions`,
      );
      setQueuedQuestions([]);
      setActiveQuestionIndex(0);
      setQuestionMode(null);
      setMcqStem("");
      setTfItems([]);
      setSbaStem("");
      setSbaOptions(["", "", "", "", ""]);
      setSbaOptionExplanations(emptySbaExplanations());
      setSelectedBoardIds([...defaultBoardIds]);
      setSummary(null);
      setSourceText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setTf = (i: number, patch: Partial<TfItem>) => {
    setTfItems((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const busy = extracting || generatingExplanations || saving;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border border-dashed bg-muted/20">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/40"
          >
            <span>Add questions (optional)</span>
            <span className="text-xs font-normal text-muted-foreground">
              {open ? "Hide" : "Show"} · AI extract or manual
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Extract from source text or add MCQ/SBA manually. Each question has its own board selection — those boards
              auto-select on this key point and increase board counts when you save questions.
            </p>

            {canSourceText ? (
              <div className="space-y-2">
                <Label>Source text</Label>
                <Textarea
                  ref={sourceTextRef}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={1}
                  className="min-h-10 resize-none overflow-hidden"
                  placeholder="Paste or type source text…"
                  disabled={busy}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {canExtract && canSourceText ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleExtractQuestions()}
                  disabled={busy || !sourceText.trim()}
                >
                  {extracting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  Extract questions (AI)
                </Button>
              ) : null}
              {canAdd ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => addManualQuestion("mcq")} disabled={busy}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add MCQ
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addManualQuestion("sba")} disabled={busy}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add SBA
                  </Button>
                </>
              ) : null}
            </div>

            {summary ? (
              <p className="text-xs text-muted-foreground">
                Detected: <span className="font-medium text-foreground">{summary}</span>
                {queuedQuestions.length > 1 ? ` · ${queuedQuestions.length} in queue` : null}
              </p>
            ) : null}

            {queuedQuestions.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs">Question queue</Label>
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {queuedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                        idx === activeQuestionIndex ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => selectQueuedQuestion(idx)}
                      >
                        <span className="font-medium uppercase text-muted-foreground">{q.questionMode}</span>{" "}
                        {(q.mcq?.stem || q.sba?.stem || "Untitled").slice(0, 60)}
                        {q.boardIds?.length ? (
                          <span className="ml-1 text-muted-foreground">
                            · {q.boardIds.length} board{q.boardIds.length > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-destructive"
                        onClick={() => removeQueuedQuestion(idx)}
                        disabled={busy}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {questionMode ? (
              <div className="space-y-4 rounded-md border bg-background p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Boards for this question
                    {queuedQuestions.length > 1 ? ` (#${activeQuestionIndex + 1})` : ""}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Each question can have different boards. Select the question in the queue first.
                  </p>
                  <BoardCheckboxGroup
                    boardOptions={boardOptions}
                    selectedIds={selectedBoardIds}
                    onChange={setActiveBoardIds}
                    compact
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty} disabled={busy}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={status} onValueChange={setStatus} disabled={busy}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marks</Label>
                    <Input
                      value={marks}
                      onChange={(e) => setMarks(e.target.value.replace(/[^\d.]/g, ""))}
                      className="h-8"
                      disabled={busy}
                    />
                  </div>
                </div>

                {canEditAi ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void generateExplanationsAi()}
                      disabled={busy}
                    >
                      {generatingExplanations ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Generate explanations (AI)
                    </Button>
                    <span className="text-[10px] text-muted-foreground">Same prompt as Create Question</span>
                  </div>
                ) : null}

                {questionMode === "mcq" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Question (stem) *</Label>
                      <Textarea
                        value={mcqStem}
                        onChange={(e) => setMcqStem(e.target.value)}
                        rows={2}
                        className="resize-y"
                        disabled={busy}
                      />
                    </div>
                    {tfItems.map((row, i) => (
                      <Card key={row.id} className="space-y-2 p-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Statement {i + 1}</Label>
                            <Textarea
                              value={row.statement}
                              onChange={(e) => setTf(i, { statement: e.target.value })}
                              rows={2}
                              className="resize-y"
                              disabled={busy}
                            />
                          </div>
                          <div className="w-full sm:w-28">
                            <Label className="text-xs">Correct</Label>
                            <Select
                              value={row.correct}
                              onValueChange={(v) => setTf(i, { correct: v as "true" | "false" })}
                              disabled={busy}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">True</SelectItem>
                                <SelectItem value="false">False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {row.correct === "true" ? "Why this is TRUE" : "Why this is FALSE"}
                          </Label>
                          <Textarea
                            value={row.explanation}
                            onChange={(e) => setTf(i, { explanation: e.target.value })}
                            rows={2}
                            className="resize-y"
                            placeholder="Explain…"
                            disabled={busy}
                          />
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setTfItems((rows) => [
                          ...rows,
                          { id: mkQuestionId(), statement: "", correct: "true", explanation: "" },
                        ])
                      }
                      disabled={busy}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add T/F statement
                    </Button>
                  </div>
                ) : null}

                {questionMode === "sba" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Question *</Label>
                      <Textarea
                        value={sbaStem}
                        onChange={(e) => setSbaStem(e.target.value)}
                        rows={2}
                        className="resize-y"
                        disabled={busy}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Options (5) *</Label>
                      {sbaOptions.map((opt, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="mt-2 w-5 text-xs text-muted-foreground">{i + 1}.</span>
                          <Textarea
                            value={opt}
                            onChange={(e) =>
                              setSbaOptions((opts) => {
                                const next = [...opts] as [string, string, string, string, string];
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            rows={1}
                            className="min-h-0 flex-1 resize-y"
                            disabled={busy}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Correct option *</Label>
                      <RadioGroup
                        value={String(sbaCorrect)}
                        onValueChange={(v) => setSbaCorrect(Number(v) as 0 | 1 | 2 | 3 | 4)}
                        className="grid grid-cols-5 gap-1"
                        disabled={busy}
                      >
                        {([0, 1, 2, 3, 4] as const).map((i) => (
                          <label key={i} className="flex cursor-pointer items-center gap-1.5 rounded-md border p-1.5 text-xs">
                            <RadioGroupItem value={String(i)} />
                            <span>{i + 1}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Explanations (per option)</Label>
                      {sbaOptions.map((_, i) => {
                        const isCorrect = sbaCorrect === i;
                        return (
                          <div key={`expl-${i}`} className="space-y-1 rounded-md border p-2">
                            <Label className="text-[10px]">
                              Option {String.fromCharCode(97 + i)}: {isCorrect ? "Why correct" : "Why wrong"}
                            </Label>
                            <Textarea
                              value={sbaOptionExplanations[i] ?? ""}
                              onChange={(e) =>
                                setSbaOptionExplanations((opts) => {
                                  const next = [...opts] as [string, string, string, string, string];
                                  next[i] = e.target.value;
                                  return next;
                                })
                              }
                              rows={2}
                              className="resize-y"
                              disabled={busy}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Extract from source text, or add an MCQ/SBA manually to start editing.
              </p>
            )}

            {canAdd && (queuedQuestions.length > 0 || questionMode) ? (
              <Button type="button" size="sm" onClick={() => void saveQuestions()} disabled={busy || !questionMode}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {queuedQuestions.length > 1
                  ? `Save all ${queuedQuestions.length} questions`
                  : "Save question(s)"}
              </Button>
            ) : null}

            {!canAdd && !canExtract ? (
              <p className="text-xs text-muted-foreground">
                Need Create Question permissions (extract / add) to use this section.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
