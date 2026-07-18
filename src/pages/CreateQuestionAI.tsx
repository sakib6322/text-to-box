import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ClipboardCopy, FileJson, FileText, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { emptyTaxonomySelection, type TaxonomySelection } from "@/lib/taxonomy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import { Can, useCan } from "@/components/Can";
import { guardPermission } from "@/lib/permissionGuard";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import { ConceptPickerDialog, ConceptSelectButton } from "@/components/ConceptPickerDialog";
import { SuggestionMatchPanel } from "@/components/SuggestionMatchPanel";
import {
  emptyConceptDetail,
  fetchConceptByIdWithBoards,
  fetchConceptByTitle,
  type ConceptDetail,
  type KeyPointWithBoards,
} from "@/lib/conceptDetail";
import {
  ACCEPTED_SOURCE_TYPES,
  fileFromPasteEvent,
  isAcceptedSourceFile,
  isPdfFile,
  prepareSourceFileForUpload,
  readFilePreview,
} from "@/lib/sourceInput";
import {
  fetchSuggestionMatches,
  toLegacyMatch,
  type LegacySuggestionMatch,
} from "@/lib/suggestionMatch";
import {
  buildExternalBulkQuestionsPrompt,
  bulkItemsToDrafts,
  parseBulkQuestionsJson,
} from "@/lib/bulkQuestionsJson";

type ExtractResult = {
  concept_name: string;
  verbatim_text: string;
  high_yield_points: string[];
};

type ExtractedMcqStatement = { text: string; correct: "true" | "false" };
type ExtractedQuestion = {
  question_type: "mcq" | "sba";
  question_number: string | null;
  stem: string;
  mcq_statements?: ExtractedMcqStatement[];
  sba_options?: { text: string }[];
  sba_correct_index?: number;
};

type SuggestionMatch = LegacySuggestionMatch;

type ApprovedPoint = {
  point_id: string;
  text: string;
  approved: boolean;
  saved?: boolean;
  approving?: boolean;
  saving?: boolean;
  approveError?: string | null;
  saveError?: string | null;
  match?: SuggestionMatch | null;
  matching?: boolean;
};

type BoardOption = { id: string; name: string };

type TfItem = {
  id: string;
  statement: string;
  /** correct answer for this True/False sub-question */
  correct: "true" | "false";
  explanation: string;
};

const emptySbaExplanations = (): [string, string, string, string, string] => ["", "", "", "", ""];

type QuestionMode = "mcq" | "sba" | null;
type DraftQuestion = {
  id: string;
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  topicId?: string;
  concept: string;
  boardIds: string[];
  metadata: {
    boards: string[];
    importantSchools: string[];
    sources: string[];
    teachers: string[];
    tags: string[];
    difficulty: string;
    status: string;
    marks: number;
  };
  mcq: { stem: string; trueFalse: TfItem[] } | null;
  sba: { stem: string; options: string[]; correctIndex: number; optionExplanations: string[] } | null;
  sourcePointId: string | null;
  match?: SuggestionMatch | null;
  matchApproved?: boolean;
  matchApproving?: boolean;
  matchApproveError?: string | null;
};

const mkId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function boardNamesFromIds(boardOptions: BoardOption[], ids: string[]): string[] {
  const byId = new Map(boardOptions.map((b) => [b.id, b.name]));
  return ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n?.trim()));
}

function BoardCheckboxGroup({
  boardOptions,
  selectedIds,
  onChange,
  compact = false,
}: {
  boardOptions: BoardOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (boardOptions.length === 0) {
    return <span className="text-sm text-muted-foreground">No boards yet. Add them in Settings.</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-2", compact ? "gap-x-3 gap-y-1" : "rounded-md border p-3")}>
      {boardOptions.map((b) => (
        <label key={b.id} className={cn("flex cursor-pointer items-center gap-2", compact ? "text-xs" : "text-sm")}>
          <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
          {b.name}
        </label>
      ))}
    </div>
  );
}

function questionStem(q: Pick<DraftQuestion, "mcq" | "sba">): string {
  return (q.mcq?.stem ?? q.sba?.stem ?? "").trim();
}

function matchPct(m: SuggestionMatch): number {
  return Math.round(m.ai_percentage ?? m.similarity * 100);
}

function matchPath(m: SuggestionMatch): string {
  return [m.concept_subject, m.concept_system, m.concept_chapter, m.concept_topic, m.concept_title]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(" → ");
}

type GeneratedExplanationResult = {
  question_index: number;
  question_mode: "mcq" | "sba";
  explanations?: string[];
  option_explanations?: string[];
};

function mergeExplanationResults(drafts: DraftQuestion[], results: GeneratedExplanationResult[]): DraftQuestion[] {
  const byIdx = new Map(results.map((r) => [r.question_index, r]));
  return drafts.map((draft, i) => {
    const gen = byIdx.get(i);
    if (!gen) return draft;
    if (draft.questionMode === "mcq" && draft.mcq && Array.isArray(gen.explanations)) {
      return {
        ...draft,
        mcq: {
          ...draft.mcq,
          trueFalse: draft.mcq.trueFalse.map((row, si) => ({
            ...row,
            explanation: gen.explanations?.[si]?.trim() || row.explanation || "",
          })),
        },
      };
    }
    if (draft.questionMode === "sba" && draft.sba && Array.isArray(gen.option_explanations)) {
      const expls = emptySbaExplanations();
      for (let j = 0; j < 5; j++) expls[j] = gen.option_explanations[j]?.trim() ?? "";
      return { ...draft, sba: { ...draft.sba, optionExplanations: [...expls] } };
    }
    return draft;
  });
}

async function fetchGeneratedExplanations(drafts: DraftQuestion[], concept?: string): Promise<DraftQuestion[]> {
  const resp = await fetch(apiUrl("/api/generate-question-explanations"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ questions: drafts, concept: concept?.trim() || undefined }),
  });
  const j = (await resp.json().catch(() => ({}))) as {
    results?: GeneratedExplanationResult[];
    error?: string;
  };
  if (!resp.ok) throw new Error(j.error ?? "Explanation generation failed");
  return mergeExplanationResults(drafts, j.results ?? []);
}

async function fetchLegacySuggestionMatches(texts: string[]): Promise<Map<string, SuggestionMatch | null>> {
  const raw = await fetchSuggestionMatches(texts);
  const legacy = new Map<string, SuggestionMatch | null>();
  for (const [text, match] of raw) {
    legacy.set(text, match ? toLegacyMatch(match) : null);
  }
  return legacy;
}

export default function CreateQuestionAI() {
  const canUpload = useCan("question_bank.create_ai.upload");
  const canSourceText = useCan("question_bank.create_ai.source_text");
  const canExtract = useCan("question_bank.create_ai.extract");
  const canBulk = useCan("question_bank.create_ai.bulk");
  const canAdd = useCan("question_bank.create_ai.add");
  const canEdit = useCan("question_bank.create_ai.edit");
  const canDelete = useCan("question_bank.create_ai.delete");

  const [conceptTitle, setConceptTitle] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptPickerOpen, setConceptPickerOpen] = useState(false);
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection());

  const [enableBijoyPaste, setEnableBijoyPaste] = useState(false);
  const [enableHelper, setEnableHelper] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [importingBulk, setImportingBulk] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [points, setPoints] = useState<ApprovedPoint[]>([]);

  const [questionMode, setQuestionMode] = useState<QuestionMode>(null);

  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [status, setStatus] = useState("published");
  const [marks, setMarks] = useState("1");
  const sourceTextRef = useRef<HTMLTextAreaElement>(null);

  const [mcqStem, setMcqStem] = useState("");
  const [tfItems, setTfItems] = useState<TfItem[]>([]);

  const [sbaStem, setSbaStem] = useState("");
  const [sbaOptions, setSbaOptions] = useState(["", "", "", "", ""]);
  const [sbaOptionExplanations, setSbaOptionExplanations] = useState<[string, string, string, string, string]>(emptySbaExplanations());
  const [sbaCorrect, setSbaCorrect] = useState<0 | 1 | 2 | 3 | 4>(0);

  const [saving, setSaving] = useState(false);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [queuedQuestions, setQueuedQuestions] = useState<DraftQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  /** Questions selected in preview for bulk match-approve / point linking. */
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set());
  const [conceptDetailsOpen, setConceptDetailsOpen] = useState(false);
  const [conceptDetailsLoading, setConceptDetailsLoading] = useState(false);
  const [conceptDetailsName, setConceptDetailsName] = useState("");
  const [conceptDetailsData, setConceptDetailsData] = useState<ConceptDetail>(emptyConceptDetail());
  const [conceptDetailsKeyPoints, setConceptDetailsKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [extractedQuestionSummary, setExtractedQuestionSummary] = useState<string | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<DraftQuestion | null>(null);

  const breadcrumb = useMemo(() => {
    const s = (v: string, fallback: string) => (v.trim() ? v.trim() : fallback);
    return [
      s(taxonomy.subjectName, "Subject"),
      s(taxonomy.systemName, "System"),
      s(taxonomy.chapterName, "Chapter"),
      s(taxonomy.topicName, "Topic"),
    ];
  }, [taxonomy]);

  const selectedBoardNames = useMemo(
    () => boardNamesFromIds(boardOptions, selectedBoardIds),
    [boardOptions, selectedBoardIds],
  );

  const boardNamesForIds = (ids: string[]) => boardNamesFromIds(boardOptions, ids);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/boards"));
        const j = (await r.json().catch(() => ({}))) as { boards?: BoardOption[] };
        if (cancelled || !r.ok || !Array.isArray(j.boards)) return;
        setBoardOptions(j.boards.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const taxonomyNames = () => ({
    subject: taxonomy.subjectName,
    system: taxonomy.systemName,
    chapter: taxonomy.chapterName,
    topic: taxonomy.topicName,
    topicId: taxonomy.topicId,
  });

  const requireTaxonomy = () => {
    if (!taxonomy.subjectId || !taxonomy.systemId || !taxonomy.chapterId || !taxonomy.topicId) {
      toast.error("Select subject, system, chapter, and topic");
      return false;
    }
    return true;
  };

  const requireSelectedConcept = () => {
    if (!selectedConceptId) {
      toast.error("Select an existing concept first");
      return false;
    }
    return true;
  };

  const selectExistingConcept = async (concept: {
    id: string;
    title: string | null;
    topic_id?: string | null;
  }) => {
    setSelectedConceptId(concept.id);
    setConceptTitle((concept.title ?? "").trim());
    const topicId = (concept.topic_id ?? "").trim();
    if (!topicId) return;
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/resolve/${encodeURIComponent(topicId)}`));
      const j = (await r.json().catch(() => ({}))) as {
        subject?: { id: string; name: string };
        system?: { id: string; name: string };
        chapter?: { id: string; name: string };
        topic?: { id: string; name: string };
      };
      if (!r.ok) return;
      setTaxonomy({
        subjectId: j.subject?.id ?? "",
        systemId: j.system?.id ?? "",
        chapterId: j.chapter?.id ?? "",
        topicId: j.topic?.id ?? "",
        subjectName: j.subject?.name ?? "",
        systemName: j.system?.name ?? "",
        chapterName: j.chapter?.name ?? "",
        topicName: j.topic?.name ?? "",
      });
    } catch {
      // keep current taxonomy
    }
  };

  const applyAutofillFromExtract = async (extracted: ExtractResult) => {
    const name = (extracted.concept_name ?? "").trim();
    if (!name) return;
    try {
      const loaded = await fetchConceptByTitle(name, {
        subject: taxonomy.subjectName || undefined,
        system: taxonomy.systemName || undefined,
        chapter: taxonomy.chapterName || undefined,
        topic: taxonomy.topicName || undefined,
      });
      if (loaded.conceptId) {
        await selectExistingConcept({
          id: loaded.conceptId,
          title: loaded.conceptName || name,
        });
        return;
      }
    } catch {
      // not found — user must pick from list
    }
    setSelectedConceptId(null);
    setConceptTitle("");
    toast.message(`Concept "${name}" not found in list — select an existing concept`);
  };

  const buildMetadata = (boardIds: string[] = selectedBoardIds): DraftQuestion["metadata"] => ({
    boards: boardNamesForIds(boardIds),
    importantSchools: [],
    sources: [],
    teachers: [],
    tags: [],
    difficulty,
    status,
    marks: Number(marks) || 0,
  });

  const resizeSourceText = () => {
    const el = sourceTextRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  };

  useEffect(() => {
    resizeSourceText();
  }, [sourceText]);

  const loadQuestionIntoForm = (q: DraftQuestion) => {
    setQuestionMode(q.questionMode);
    setSelectedBoardIds(q.boardIds ?? []);
    if (q.topicId) {
      void (async () => {
        try {
          const r = await fetch(apiUrl(`/api/taxonomy/resolve/${encodeURIComponent(q.topicId)}`));
          const j = (await r.json().catch(() => ({}))) as {
            subject?: { id: string; name: string };
            system?: { id: string; name: string };
            chapter?: { id: string; name: string };
            topic?: { id: string; name: string };
          };
          if (!r.ok) return;
          setTaxonomy({
            subjectId: j.subject?.id ?? "",
            subjectName: j.subject?.name ?? "",
            systemId: j.system?.id ?? "",
            systemName: j.system?.name ?? "",
            chapterId: j.chapter?.id ?? "",
            chapterName: j.chapter?.name ?? "",
            topicId: j.topic?.id ?? q.topicId,
            topicName: j.topic?.name ?? q.topic,
          });
        } catch {
          /* keep current taxonomy */
        }
      })();
    }
    if (q.questionMode === "mcq" && q.mcq) {
      setMcqStem(q.mcq.stem);
      setTfItems(
        q.mcq.trueFalse.length
          ? q.mcq.trueFalse.map((r) => ({ ...r, explanation: r.explanation ?? "" }))
          : [{ id: mkId(), statement: "", correct: "true", explanation: "" }],
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

  const draftFromExtracted = (q: ExtractedQuestion, conceptOverride?: string): DraftQuestion => {
    const t = taxonomyNames();
    const concept = conceptOverride ?? conceptTitle;
    if (q.question_type === "mcq") {
      return {
        id: mkId(),
        questionMode: "mcq",
        subject: t.subject,
        system: t.system,
        chapter: t.chapter,
        topic: t.topic,
        topicId: t.topicId,
        concept,
        boardIds: [],
        metadata: buildMetadata([]),
        mcq: {
          stem: q.stem,
          trueFalse: (q.mcq_statements ?? []).map((row) => ({
            id: mkId(),
            statement: row.text,
            correct: row.correct,
            explanation: "",
          })),
        },
        sba: null,
        sourcePointId: null,
      };
    }

    const opts: [string, string, string, string, string] = ["", "", "", "", ""];
    (q.sba_options ?? []).slice(0, 5).forEach((row, i) => {
      opts[i] = row.text;
    });

    return {
      id: mkId(),
      questionMode: "sba",
      subject: t.subject,
      system: t.system,
      chapter: t.chapter,
      topic: t.topic,
      topicId: t.topicId,
      concept,
      boardIds: [],
      metadata: buildMetadata([]),
      mcq: null,
      sba: {
        stem: q.stem,
        options: opts,
        correctIndex: (q.sba_correct_index ?? 0) as 0 | 1 | 2 | 3 | 4,
        optionExplanations: [...emptySbaExplanations()],
      },
      sourcePointId: null,
    };
  };

  const applyExtractedQuestions = async (questions: ExtractedQuestion[], conceptOverride?: string) => {
    if (questions.length === 0) {
      setExtractedQuestionSummary(null);
      return;
    }

    let drafts = questions.map((q) => draftFromExtracted(q, conceptOverride));
    try {
      const stems = drafts.map(questionStem).filter(Boolean);
      const bestByText = await fetchLegacySuggestionMatches(stems);
      drafts = drafts.map((q) => {
        const stem = questionStem(q);
        const match = stem ? (bestByText.get(stem) ?? null) : null;
        return {
          ...q,
          match,
          matchApproved: false,
          matchApproving: false,
          matchApproveError: null,
          sourcePointId: null,
        };
      });
    } catch {
      /* non-blocking — questions still load without match scores */
    }

    setGeneratingExplanations(true);
    try {
      drafts = await fetchGeneratedExplanations(drafts, conceptOverride ?? conceptTitle);
    } catch (e) {
      toast.warning(e instanceof Error ? e.message : "Could not auto-generate explanations");
    } finally {
      setGeneratingExplanations(false);
    }

    setQueuedQuestions(drafts);
    setActiveQuestionIndex(0);
    setSelectedQuestionIds(new Set(drafts.map((d) => d.id)));
    loadQuestionIntoForm(drafts[0]);

    const mcqCount = questions.filter((q) => q.question_type === "mcq").length;
    const sbaCount = questions.filter((q) => q.question_type === "sba").length;
    const parts = [];
    if (mcqCount) parts.push(`${mcqCount} MCQ`);
    if (sbaCount) parts.push(`${sbaCount} SBA`);
    setExtractedQuestionSummary(parts.join(", "));
  };

  const onPickImage = async (f: File) => {
    if (!guardPermission("question_bank.create_ai.upload")) return;
    if (!isAcceptedSourceFile(f)) {
      toast.error("Please choose an image or PDF file");
      return;
    }

    setImageFile(f);
    setIsPdf(isPdfFile(f));
    if (isPdfFile(f)) {
      setImagePreview(null);
    } else {
      try {
        setImagePreview(await readFilePreview(f));
      } catch {
        setImagePreview(null);
      }
    }
  };


  const onPaste = async (e: React.ClipboardEvent) => {
    const f = await fileFromPasteEvent(e.nativeEvent);
    if (f) {
      e.preventDefault();
      await onPickImage(f);
      toast.success(isPdfFile(f) ? "PDF pasted" : "Image pasted");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPickImage(f);
  };

  const applyExtractedPoints = async (texts: string[], options?: { skipMatching?: boolean }) => {
    const skipMatching = options?.skipMatching === true;
    const initial: ApprovedPoint[] = texts.map((text) => ({
      point_id: mkId(),
      text,
      approved: false,
      saved: false,
      approveError: null,
      saveError: null,
      match: null,
      matching: !skipMatching,
    }));
    setPoints(initial);

    if (skipMatching) return;

    try {
      const bestByText = await fetchLegacySuggestionMatches(texts);
      setPoints((prev) =>
        prev.map((p) => ({
          ...p,
          match: bestByText.get(p.text.trim()) ?? null,
          matching: false,
        })),
      );
    } catch {
      setPoints((prev) => prev.map((p) => ({ ...p, matching: false })));
    }
  };

  const handleExtract = async (options?: { skipMatching?: boolean }) => {
    const skipMatching = options?.skipMatching === true;
    if (!guardPermission("question_bank.create_ai.extract")) return;
    if (!imageFile && !sourceText.trim()) return toast.error("Please upload image or paste text");
    if (imageFile && !guardPermission("question_bank.create_ai.upload")) return;
    if (!imageFile && sourceText.trim() && !canSourceText) {
      return toast.error("No permission to use source text for extract");
    }
    setExtracting(true);
    setExtractedQuestionSummary(null);
    try {
      const formData = new FormData();
      if (imageFile) {
        const prepared = await prepareSourceFileForUpload(imageFile);
        formData.append("image", prepared);
      }
      if (sourceText.trim()) formData.append("input_text", sourceText.trim());

      const authHeaders = getAuthHeaders();
      const [conceptResp, questionsResp] = await Promise.all([
        fetch(apiUrl("/api/extract-concept"), { method: "POST", headers: authHeaders, body: formData }),
        fetch(apiUrl("/api/extract-questions"), { method: "POST", headers: authHeaders, body: formData }),
      ]);

      const data = (await conceptResp.json().catch(() => ({}))) as {
        error?: string;
        concept_name?: string;
        verbatim_text?: string;
        high_yield_points?: string[];
      };
      if (!conceptResp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      const extracted: ExtractResult = {
        concept_name: typeof data?.concept_name === "string" ? data.concept_name : "",
        verbatim_text: typeof data?.verbatim_text === "string" ? data.verbatim_text : "",
        high_yield_points: Array.isArray(data?.high_yield_points) ? data.high_yield_points.filter((x): x is string => typeof x === "string") : [],
      };

      const questionsData = (await questionsResp.json().catch(() => ({}))) as {
        error?: string;
        questions?: ExtractedQuestion[];
      };
      if (!questionsResp.ok) {
        console.warn("extract-questions:", questionsData?.error);
      }

      const extractedQuestions = Array.isArray(questionsData?.questions)
        ? questionsData.questions.filter(
            (q): q is ExtractedQuestion =>
              Boolean(q) &&
              (q.question_type === "mcq" || q.question_type === "sba") &&
              typeof q.stem === "string" &&
              q.stem.trim().length > 0,
          )
        : [];

      setResult(extracted);
      void applyExtractedPoints(extracted.high_yield_points, { skipMatching });
      await applyAutofillFromExtract(extracted);
      await applyExtractedQuestions(extractedQuestions, extracted.concept_name);
      const questionMsg =
        extractedQuestions.length > 0
          ? ` · ${extractedQuestions.length} question${extractedQuestions.length > 1 ? "s" : ""} (verbatim MCQ/SBA)`
          : "";
      const matchMsg = skipMatching ? " (no key-point matching)" : "";
      toast.success(`Extracted ${extracted.high_yield_points.length} points${questionMsg}${matchMsg}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  /** Link a key point id onto selected questions (or all unmatched ones if none selected). */
  const linkPointToQuestions = (pointId: string) => {
    if (queuedQuestions.length === 0) return;
    updateActiveDraftFromForm();
    const useSelection = selectedQuestionIds.size > 0;
    setQueuedQuestions((prev) =>
      prev.map((q) => {
        if (useSelection && !selectedQuestionIds.has(q.id)) return q;
        if (q.matchApproved) return q;
        return { ...q, sourcePointId: pointId };
      }),
    );
  };

  const approvePoint = async (idx: number) => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    const p = points[idx];
    if (!p) return;
    if (!p.match?.key_point_id) {
      return toast.error("No match to approve. Use Save to add this as a new key point.");
    }
    if (!requireTaxonomy()) return;
    const text = p.text.trim();
    if (!text) return toast.error("Point text is required");
    if (queuedQuestions.length > 0) updateActiveDraftFromForm();
    const boardIds = selectedBoardIds;
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, approving: true, approveError: null } : x)));
    try {
      const resp = await fetch(apiUrl("/api/approve-point"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          mode: "approve",
          matched_key_point_id: p.match.key_point_id,
          question_text: text,
          board_ids: boardIds,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        point_id?: string;
        board_count_added?: number;
      };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Approval failed");

      const pointId = typeof data?.point_id === "string" ? data.point_id : p.match.key_point_id;
      setPoints((ps) =>
        ps.map((x, i) =>
          i === idx
            ? {
                ...x,
                approved: true,
                approving: false,
                approveError: null,
                point_id: pointId,
              }
            : x,
        ),
      );
      linkPointToQuestions(pointId);
      const added = Number(data.board_count_added ?? boardIds.length);
      toast.success(
        added > 0
          ? `Approved — matched key point count +${added} (per board); no new key point created`
          : "Approved — linked matched key point (no boards → count unchanged)",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      toast.error(msg);
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, approving: false, approveError: msg } : x)));
    }
  };

  const savePoint = async (idx: number) => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    const p = points[idx];
    if (!p) return;
    if (!requireTaxonomy()) return;
    if (!requireSelectedConcept()) return;
    const text = p.text.trim();
    if (!text) return toast.error("Point text is required");
    if (queuedQuestions.length > 0) updateActiveDraftFromForm();
    const boardIds = selectedBoardIds;
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: true, saveError: null } : x)));
    try {
      const resp = await fetch(apiUrl("/api/approve-point"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          mode: "save",
          matched_key_point_id: null,
          concept_id: selectedConceptId,
          question_text: text,
          board_ids: boardIds,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        created_new_point?: boolean;
        point_id?: string;
        board_count_added?: number;
      };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");

      const pointId = typeof data?.point_id === "string" ? data.point_id : p.point_id;
      setPoints((ps) =>
        ps.map((x, i) =>
          i === idx
            ? {
                ...x,
                saved: true,
                saving: false,
                saveError: null,
                point_id: pointId,
              }
            : x,
        ),
      );

      linkPointToQuestions(pointId);
      const added = Number(data.board_count_added ?? boardIds.length);
      toast.success(
        added > 0
          ? `Saved new key point under selected concept (count ${added})`
          : "Saved new key point under selected concept (count 0 — no boards)",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: false, saveError: msg } : x)));
    }
  };

  const refreshPointMatch = async (idx: number) => {
    const p = points[idx];
    if (!p?.text.trim()) return;
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, matching: true } : x)));
    try {
      const bestByText = await fetchLegacySuggestionMatches([p.text.trim()]);
      const match = bestByText.get(p.text.trim()) ?? null;
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, match, matching: false } : x)));
    } catch {
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, matching: false } : x)));
    }
  };

  const openMatchConceptDetails = async (match: SuggestionMatch) => {
    if (!match.concept_id) {
      toast.error("No concept linked to this match");
      return;
    }
    setConceptDetailsOpen(true);
    setConceptDetailsLoading(true);
    setConceptDetailsName(match.concept_title ?? "");
    setConceptDetailsData(emptyConceptDetail());
    setConceptDetailsKeyPoints([]);
    try {
      const loaded = await fetchConceptByIdWithBoards(match.concept_id);
      setConceptDetailsName(loaded.conceptName);
      setConceptDetailsData(loaded.detail);
      setConceptDetailsKeyPoints(loaded.keyPoints);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load concept");
      setConceptDetailsOpen(false);
    } finally {
      setConceptDetailsLoading(false);
    }
  };

  const approveQuestionMatch = async (index: number, options?: { quiet?: boolean }) => {
    if (!guardPermission("question_bank.create_ai.add")) return false;
    const q = index === activeQuestionIndex ? buildCurrentDraftFromForm() : queuedQuestions[index];
    if (!q?.match?.key_point_id) return false;
    if (!requireTaxonomy()) return false;
    const stem = questionStem(q);
    if (!stem) {
      if (!options?.quiet) toast.error("Question stem is required to approve match");
      return false;
    }

    setQueuedQuestions((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, matchApproving: true, matchApproveError: null } : item,
      ),
    );
    try {
      const boardIds = q.boardIds ?? [];
      const resp = await fetch(apiUrl("/api/approve-point"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          mode: "approve",
          matched_key_point_id: q.match!.key_point_id,
          question_text: stem,
          board_ids: boardIds,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        point_id?: string;
        board_count_added?: number;
      };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Approval failed");

      setQueuedQuestions((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                matchApproved: true,
                matchApproving: false,
                matchApproveError: null,
                sourcePointId: data.point_id ?? q.match!.key_point_id,
              }
            : item,
        ),
      );
      if (!options?.quiet) {
        const added = Number(data.board_count_added ?? boardIds.length);
        toast.success(
          added > 0
            ? `Match approved — count +${added} on matched key point`
            : "Match approved — linked key point (no boards)",
        );
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      setQueuedQuestions((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, matchApproving: false, matchApproveError: msg } : item,
        ),
      );
      if (!options?.quiet) toast.error(msg);
      return false;
    }
  };

  const approveSelectedQuestionMatches = async () => {
    if (queuedQuestions.length === 0) return;
    updateActiveDraftFromForm();
    const indexes = queuedQuestions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => selectedQuestionIds.has(q.id) && q.match?.key_point_id && !q.matchApproved)
      .map(({ i }) => i);
    if (indexes.length === 0) {
      return toast.error("Select questions that have an unapproved match");
    }
    let ok = 0;
    for (const i of indexes) {
      if (await approveQuestionMatch(i, { quiet: true })) ok += 1;
    }
    toast.success(`Approved ${ok} of ${indexes.length} selected question match(es)`);
  };

  const toggleQuestionSelected = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addTfQuestion = () => {
    setTfItems((rows) => [...rows, { id: mkId(), statement: "", correct: "true", explanation: "" }]);
  };

  const setTf = (i: number, patch: Partial<TfItem>) => {
    setTfItems((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const setSbaOption = (i: number, v: string) => {
    setSbaOptions((opts) => opts.map((o, j) => (j === i ? v : o)) as [string, string, string, string, string]);
  };

  const setSbaOptionExplanation = (i: number, v: string) => {
    setSbaOptionExplanations((opts) => opts.map((o, j) => (j === i ? v : o)) as [string, string, string, string, string]);
  };

  const resetForm = () => {
    setSelectedBoardIds([]);
    setDifficulty("medium");
    setStatus("published");
    setMarks("1");
    setMcqStem("");
    setTfItems([]);
    setSbaStem("");
    setSbaOptions(["", "", "", "", ""]);
    setSbaOptionExplanations(emptySbaExplanations());
    setSbaCorrect(0);
    setQuestionMode(null);
    setResult(null);
    setPoints([]);
    setQueuedQuestions([]);
    setActiveQuestionIndex(0);
    setSelectedQuestionIds(new Set());
    setExtractedQuestionSummary(null);
    setSourceText("");
    setConceptTitle("");
    setSelectedConceptId(null);
    setTaxonomy(emptyTaxonomySelection());
  };

  const generateExplanationsAi = async () => {
    if (!guardPermission("question_bank.create_ai.edit")) return;
    if (!questionMode) return toast.error("Select MCQ or SBA first");
    const stem = questionMode === "mcq" ? mcqStem.trim() : sbaStem.trim();
    if (!stem) return toast.error("Enter question stem first");
    setGeneratingExplanations(true);
    try {
      if (queuedQuestions.length > 0) updateActiveDraftFromForm();
      const targets = queuedQuestions.length > 0 ? questionsForSave() : [buildCurrentDraftFromForm()];
      const updated = await fetchGeneratedExplanations(targets, conceptTitle);
      setQueuedQuestions(updated.length > 1 || queuedQuestions.length > 0 ? updated : queuedQuestions);
      const active = updated[activeQuestionIndex] ?? updated[0];
      if (active) loadQuestionIntoForm(active);
      toast.success("Explanations generated by AI");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Explanation generation failed");
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const saveQuestion = async () => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    if (!questionMode) return toast.error("Select a question type");
    if (!requireTaxonomy()) return;
    if (!requireSelectedConcept()) return;
    const toSave = questionsForSave();
    setSaving(true);
    try {
      const payload = {
        source: {
          text: sourceText.trim() || null,
          hasImage: Boolean(imageFile),
        },
        questions: toSave,
      };
      const resp = await fetch(apiUrl("/api/save-question"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");
      toast.success(`${payload.questions.length} question saved`);
      setQueuedQuestions([]);
      setSelectedQuestionIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addQuestionToPaper = (mode: "mcq" | "sba" = questionMode as "mcq" | "sba") => {
    if (!guardPermission("question_bank.create_ai.add")) return;
    if (!mode) return toast.error("Select question type first");
    if (!requireTaxonomy()) return;
    const t = taxonomyNames();
    const next: DraftQuestion = {
      id: mkId(),
      questionMode: mode,
      subject: t.subject,
      system: t.system,
      chapter: t.chapter,
      topic: t.topic,
      topicId: t.topicId,
      concept: conceptTitle,
      boardIds: [...selectedBoardIds],
      metadata: buildMetadata(selectedBoardIds),
      mcq: mode === "mcq" ? { stem: mcqStem, trueFalse: tfItems } : null,
      sba:
        mode === "sba"
          ? { stem: sbaStem, options: sbaOptions, correctIndex: sbaCorrect, optionExplanations: [...sbaOptionExplanations] }
          : null,
      sourcePointId: points.find((p) => p.approved)?.point_id ?? null,
    };
    setQuestionMode(mode);
    setQueuedQuestions((prev) => {
      const merged = [...prev, next];
      setActiveQuestionIndex(merged.length - 1);
      return merged;
    });
    toast.success(`${mode.toUpperCase()} question added to paper`);
  };

  const selectQueuedQuestion = (index: number) => {
    if (index === activeQuestionIndex) return;
    updateActiveDraftFromForm();
    const q = queuedQuestions[index];
    if (!q) return;
    setActiveQuestionIndex(index);
    loadQuestionIntoForm(q);
  };

  const handleBulkImport = async (rawOverride?: string) => {
    if (!guardPermission("question_bank.create_ai.bulk")) return;
    if (!requireTaxonomy()) return;
    if (!requireSelectedConcept()) return;
    const raw = (rawOverride ?? bulkJsonText).trim();
    if (!raw) {
      toast.error("Paste JSON or upload a .json file first");
      return;
    }
    if (queuedQuestions.length > 0) {
      const ok = window.confirm(
        `Replace the current queue of ${queuedQuestions.length} question(s) with the bulk import?`,
      );
      if (!ok) return;
    }

    setImportingBulk(true);
    try {
      const parsed = parseBulkQuestionsJson(raw);
      const t = taxonomyNames();
      const mapped = bulkItemsToDrafts(parsed.items, {
        subject: t.subject,
        system: t.system,
        chapter: t.chapter,
        topic: t.topic,
        topicId: t.topicId,
        concept: conceptTitle.trim(),
        boardOptions,
        difficulty,
        status,
        marks: Number(marks) || 1,
        mkId,
      });

      const drafts: DraftQuestion[] = mapped.drafts.map((d) => ({
        ...d,
        topicId: t.topicId || undefined,
        match: null,
        matchApproved: false,
        matchApproving: false,
        matchApproveError: null,
      }));

      const allWarnings = [...parsed.warnings, ...mapped.warnings];
      for (const w of allWarnings.slice(0, 8)) toast.warning(w);
      if (allWarnings.length > 8) toast.warning(`${allWarnings.length - 8} more warning(s)…`);

      setQueuedQuestions(drafts);
      setActiveQuestionIndex(0);
      setSelectedQuestionIds(new Set(drafts.map((d) => d.id)));
      loadQuestionIntoForm(drafts[0]);
      setBulkJsonText(raw);
      setExtractedQuestionSummary(
        `Bulk import · ${drafts.filter((d) => d.questionMode === "mcq").length} MCQ · ${drafts.filter((d) => d.questionMode === "sba").length} SBA`,
      );

      toast.success(
        `Imported ${drafts.length} question(s) · ${mapped.boardsResolved} board link(s) — review queue, then Save`,
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Bulk import failed");
    } finally {
      setImportingBulk(false);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  const copyBulkExternalPrompt = async () => {
    const prompt = buildExternalBulkQuestionsPrompt(boardOptions.map((b) => b.name));
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("External AI prompt copied — paste into ChatGPT/Claude, then paste JSON back here");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const buildCurrentDraftFromForm = (): DraftQuestion => {
    const t = taxonomyNames();
    const existing = queuedQuestions[activeQuestionIndex];
    return {
      id: existing?.id ?? mkId(),
      questionMode: questionMode as "mcq" | "sba",
      subject: t.subject,
      system: t.system,
      chapter: t.chapter,
      topic: t.topic,
      topicId: t.topicId,
      concept: conceptTitle,
      boardIds: [...selectedBoardIds],
      metadata: buildMetadata(selectedBoardIds),
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
      sourcePointId: existing?.sourcePointId ?? points.find((p) => p.approved)?.point_id ?? null,
      match: existing?.match ?? null,
      matchApproved: existing?.matchApproved ?? false,
      matchApproving: existing?.matchApproving ?? false,
      matchApproveError: existing?.matchApproveError ?? null,
    };
  };

  const updateActiveDraftFromForm = () => {
    if (queuedQuestions.length === 0 || !questionMode) return;
    const updated = buildCurrentDraftFromForm();
    setQueuedQuestions((prev) => prev.map((q, i) => (i === activeQuestionIndex ? updated : q)));
  };

  const questionsForSave = (): DraftQuestion[] => {
    const current = buildCurrentDraftFromForm();
    if (queuedQuestions.length === 0) return [current];
    return queuedQuestions.map((q, i) => {
      const draft = i === activeQuestionIndex ? current : q;
      const sourcePointId =
        draft.matchApproved && draft.match?.key_point_id
          ? draft.sourcePointId ?? draft.match.key_point_id
          : draft.sourcePointId ?? null;
      return { ...draft, sourcePointId, metadata: { ...draft.metadata, boards: boardNamesForIds(draft.boardIds ?? []) } };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Create Question</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={`${b}-${i}`} className="inline-flex max-w-full items-center gap-1">
                <span className="max-w-[12rem] truncate sm:max-w-[16rem]">{b}</span>
                {i < breadcrumb.length - 1 ? <ChevronRight className="h-4 w-4 shrink-0 opacity-60" /> : null}
              </span>
            ))}
          </div>
        </div>
        <Badge variant="secondary">AI auto-fill or manual</Badge>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Concept *</Label>
            <ConceptSelectButton
              conceptTitle={conceptTitle}
              selectedId={selectedConceptId}
              onOpen={() => setConceptPickerOpen(true)}
              onClear={() => {
                setSelectedConceptId(null);
                setConceptTitle("");
              }}
            />
          </div>
          <TaxonomySelects value={taxonomy} onChange={setTaxonomy} required />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enableBijoyPaste} onCheckedChange={(v) => setEnableBijoyPaste(Boolean(v))} />
            Enable Bijoy Paste
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enableHelper} onCheckedChange={(v) => setEnableHelper(Boolean(v))} />
            Enable Helper
          </label>
        </div>

        <div className="mt-4 space-y-4">
          <Can permission="question_bank.create_ai.upload">
          <div className="space-y-2">
            <Label>Upload image / PDF for extract</Label>
            <div
              role="button"
              tabIndex={0}
              onDragOver={canUpload ? onDragOver : undefined}
              onDragLeave={canUpload ? onDragLeave : undefined}
              onDrop={canUpload ? onDrop : undefined}
              onPaste={canUpload ? onPaste : undefined}
              onClick={() => canUpload && fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && canUpload && fileRef.current?.click()}
              className={[
                "rounded-lg border-2 border-dashed p-4 text-center transition-colors max-w-md",
                canUpload ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                dragOver && canUpload ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
              ].join(" ")}
            >
              <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">ছবি/PDF ড্র্যাগ, ক্লিক করুন</p>
              <p className="text-xs text-muted-foreground mt-1">Image অথবা PDF — extract এর জন্য</p>
              <Input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_SOURCE_TYPES}
                className="sr-only"
                disabled={!canUpload}
                onChange={(e) => e.target.files?.[0] && void onPickImage(e.target.files[0])}
              />
            </div>
            {isPdf && imageFile ? (
              <div className="max-w-md rounded-md border p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-5 w-5 shrink-0" />
                <span>{imageFile.name}</span>
              </div>
            ) : null}
            {imagePreview ? (
              <div className="max-w-md rounded-md overflow-hidden border">
                <img src={imagePreview} alt="Upload preview" className="w-full" />
              </div>
            ) : null}
          </div>
          </Can>

          <Can permission="question_bank.create_ai.extract">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button onClick={() => void handleExtract()} disabled={(!imageFile && !sourceText.trim()) || extracting} type="button">
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract concept"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExtract({ skipMatching: true })}
              disabled={(!imageFile && !sourceText.trim()) || extracting}
              type="button"
            >
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract concept without matching"}
            </Button>
          </div>
          </Can>
        </div>
        <Can permission="question_bank.create_ai.source_text">
        <div className="mt-4 space-y-2">
          <Label>Source text (Text to concept generator)</Label>
          <Textarea
            ref={sourceTextRef}
            value={sourceText}
            onChange={(e) => canSourceText && setSourceText(e.target.value)}
            readOnly={!canSourceText}
            rows={1}
            className="min-h-10 resize-none overflow-hidden"
            placeholder="Paste or type source text…"
          />
        </div>
        </Can>
      </Card>

      <Can permission="question_bank.create_ai.bulk">
        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Bulk JSON (no AI)</h2>
            <p className="text-xs text-muted-foreground mt-1">
              External AI দিয়ে JSON বানিয়ে এখানে paste করুন — Gemini ছাড়াই MCQ/SBA queue-তে যাবে। প্রতিটি
              প্রশ্নের <code className="text-[11px]">boards</code> name দিয়ে auto-select হবে। Concept +
              taxonomy আগে select করতে হবে।
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-questions-json">Questions JSON</Label>
            <Textarea
              id="bulk-questions-json"
              value={bulkJsonText}
              onChange={(e) => canBulk && setBulkJsonText(e.target.value)}
              readOnly={!canBulk || importingBulk}
              rows={10}
              className="font-mono text-xs min-h-[160px]"
              placeholder='{ "questions": [ { "type": "mcq", "stem": "...", "boards": [], "statements": [...] }, ... ] }'
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleBulkImport()}
              disabled={importingBulk || !bulkJsonText.trim()}
            >
              {importingBulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
              {importingBulk ? "Importing…" : "Import to queue"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyBulkExternalPrompt()} disabled={importingBulk}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy external AI prompt
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href="/samples/create-question-bulk.json" download>
                Download sample JSON
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={importingBulk}
              onClick={() => bulkFileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload .json
            </Button>
            <Input
              ref={bulkFileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              disabled={!canBulk || importingBulk}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                void (async () => {
                  try {
                    const text = await f.text();
                    setBulkJsonText(text);
                    await handleBulkImport(text);
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Failed to read file");
                  }
                })();
              }}
            />
          </div>
        </Card>
      </Can>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-4">
          <div className="text-sm font-medium">Select question type *</div>
          <p className="mt-1 text-xs text-muted-foreground">Only these two types are available.</p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setQuestionMode("mcq");
                setTfItems((rows) => (rows.length > 0 ? rows : [{ id: mkId(), statement: "", correct: "true", explanation: "" }]));
              }}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                questionMode === "mcq" ? "border-primary bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/50",
              )}
            >
              <div className="font-medium">MCQ</div>
              <div className="text-xs text-muted-foreground">Multiple choice · with True/False under the question</div>
            </button>
            <button
              type="button"
              onClick={() => setQuestionMode("sba")}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                questionMode === "sba" ? "border-primary bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/50",
              )}
            >
              <div className="font-medium">SBA</div>
              <div className="text-xs text-muted-foreground">Single best answer · five options</div>
            </button>
          </div>
        </Card>

        <Card className="p-4">
          {!result ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <p className="text-sm font-medium text-foreground">Extraction</p>
              <p className="max-w-md text-sm">Use image extract above to autofill, or type concept fields and the form below manually.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Extracted points</div>
                  <div className="text-xs text-muted-foreground">
                    Approve = matched KP-এর count বাড়ায় (board সংখ্যা অনুযায়ী) — নতুন KP তৈরি হয় না। Save = selected concept-এ নতুন KP সেভ (boards থাকলে count, না থাকলে 0)।
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">
                    {points.filter((p) => p.approved).length}/{points.length} approved
                  </Badge>
                  <Badge variant="outline">
                    {points.filter((p) => p.saved).length}/{points.length} saved
                  </Badge>
                </div>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {points.map((p, idx) => (
                  <Card key={p.point_id} className="p-3 space-y-2">
                    <Textarea
                      value={p.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setPoints((ps) =>
                          ps.map((x, i) => (i === idx ? { ...x, text, match: null, matching: false } : x)),
                        );
                      }}
                      onBlur={() => void refreshPointMatch(idx)}
                      rows={2}
                      className="resize-none"
                    />
                    {p.matching ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Matching suggestions…
                      </div>
                    ) : (
                      <SuggestionMatchPanel
                        match={p.match}
                        matchApproved={p.approved}
                        matchApproving={p.approving}
                        matchApproveError={p.approveError}
                        pointSaved={p.saved}
                        pointSaving={p.saving}
                        pointSaveError={p.saveError}
                        selectedBoardNames={selectedBoardNames}
                        onApprove={p.match ? () => void approvePoint(idx) : undefined}
                        onSave={() => void savePoint(idx)}
                        onViewConcept={p.match ? () => void openMatchConceptDetails(p.match!) : undefined}
                        onMatchUpdate={(updated) => {
                          setPoints((ps) =>
                            ps.map((x, i) =>
                              i === idx
                                ? { ...x, match: { ...x.match!, key_point_content: updated.keyPointContent } }
                                : x,
                            ),
                          );
                        }}
                      />
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium">Question details</div>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">All fields are editable. Multi-value fields use one or more lines.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label>Boards (this question)</Label>
            <p className="text-xs text-muted-foreground">
              Select a question in the preview, then set boards here. Those boards apply when you Approve or Save a key point (and when you Save questions).
              {queuedQuestions.length > 1 ? ` Editing question ${activeQuestionIndex + 1} of ${queuedQuestions.length}.` : null}
            </p>
            <BoardCheckboxGroup
              boardOptions={boardOptions}
              selectedIds={selectedBoardIds}
              onChange={setSelectedBoardIds}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Difficulty *</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Marks *</Label>
            <Input
              value={marks}
              onChange={(e) => setMarks(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
          </div>
        </div>

        {extractedQuestionSummary ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Detected from image (verbatim): <span className="font-medium text-foreground">{extractedQuestionSummary}</span>
            {queuedQuestions.length > 1 ? ` · ${queuedQuestions.length} questions in paper — select below to edit each` : null}
            {queuedQuestions.some((q) => q.match) ? " · approve match optional (links suggestion when approved)" : null}
          </p>
        ) : null}

        {queuedQuestions[activeQuestionIndex]?.match ? (
          <div className="mt-4">
            <SuggestionMatchPanel
              match={queuedQuestions[activeQuestionIndex]?.match}
              matchApproved={queuedQuestions[activeQuestionIndex]?.matchApproved}
              matchApproving={queuedQuestions[activeQuestionIndex]?.matchApproving}
              matchApproveError={queuedQuestions[activeQuestionIndex]?.matchApproveError}
              selectedBoardNames={selectedBoardNames}
              onApprove={() => approveQuestionMatch(activeQuestionIndex)}
              onViewConcept={() => {
                const m = queuedQuestions[activeQuestionIndex]?.match;
                if (m) void openMatchConceptDetails(m);
              }}
              onMatchUpdate={(updated) => {
                setQueuedQuestions((qs) =>
                  qs.map((q, i) =>
                    i === activeQuestionIndex
                      ? { ...q, match: { ...q.match!, key_point_content: updated.keyPointContent } }
                      : q,
                  ),
                );
              }}
            />
          </div>
        ) : null}

        {questionMode ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateExplanationsAi}
              disabled={generatingExplanations || extracting}
            >
              {generatingExplanations ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate explanations (AI)
            </Button>
            <span className="text-xs text-muted-foreground">
              Auto-fills why correct / why wrong for each statement or option
            </span>
          </div>
        ) : null}

        {questionMode === "mcq" ? (
          <div className="mt-8 space-y-4 border-t pt-6">
            <div className="text-sm font-medium text-primary">MCQ</div>
            <div className="space-y-2">
              <Label>Question (stem) *</Label>
              <Textarea value={mcqStem} onChange={(e) => setMcqStem(e.target.value)} rows={3} className="resize-y" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">True/False (under the question)</div>
              {tfItems.length === 0 ? <p className="text-sm text-muted-foreground">Use &quot;Add question&quot; to add a T/F sub-question.</p> : null}
              {tfItems.map((row, i) => (
                <Card key={row.id} className="p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="flex-1 space-y-2">
                      <Label>Statement {i + 1}</Label>
                      <Textarea
                        value={row.statement}
                        onChange={(e) => setTf(i, { statement: e.target.value })}
                        rows={2}
                        className="resize-y"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <Label>Correct</Label>
                      <Select
                        value={row.correct}
                        onValueChange={(v) => setTf(i, { correct: v as "true" | "false" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{row.correct === "true" ? "Why this is TRUE" : "Why this is FALSE"}</Label>
                    <Textarea
                      value={row.explanation ?? ""}
                      onChange={(e) => setTf(i, { explanation: e.target.value })}
                      rows={2}
                      className="resize-y"
                      placeholder="Explain why this statement is true or false…"
                    />
                  </div>
                </Card>
              ))}
            </div>
            <Button type="button" className="w-full" onClick={addTfQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Button>
          </div>
        ) : null}

        {questionMode === "sba" ? (
          <div className="mt-8 space-y-4 border-t pt-6">
            <div className="text-sm font-medium text-primary">SBA (single best answer)</div>
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea value={sbaStem} onChange={(e) => setSbaStem(e.target.value)} rows={3} className="resize-y" />
            </div>
            <div className="space-y-3">
              <Label>Options (5) *</Label>
              {sbaOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-2 w-6 text-sm font-medium text-muted-foreground">{i + 1}.</span>
                  <Textarea
                    value={opt}
                    onChange={(e) => setSbaOption(i, e.target.value)}
                    rows={2}
                    className="min-h-0 flex-1 resize-y"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Label>Explanations (per option)</Label>
              {sbaOptions.map((opt, i) => {
                const label = String.fromCharCode(97 + i);
                const isCorrect = sbaCorrect === i;
                return (
                  <div key={`expl-${i}`} className="space-y-1.5 rounded-md border p-3">
                    <Label className="text-xs">
                      Option {label}: {isCorrect ? "Why this is correct" : "Why this is wrong"}
                    </Label>
                    <Textarea
                      value={sbaOptionExplanations[i] ?? ""}
                      onChange={(e) => setSbaOptionExplanation(i, e.target.value)}
                      rows={2}
                      className="resize-y"
                      placeholder={isCorrect ? "Explain why this is the best answer…" : "Explain why this option is incorrect…"}
                    />
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label>Correct option *</Label>
              <RadioGroup
                value={String(sbaCorrect)}
                onValueChange={(v) => setSbaCorrect(Number(v) as 0 | 1 | 2 | 3 | 4)}
                className="grid grid-cols-5 gap-2"
              >
                {([0, 1, 2, 3, 4] as const).map((i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <RadioGroupItem value={String(i)} />
                    <span>{i + 1}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-2">
        <Can permission="question_bank.create_ai.add">
        <Button type="button" variant="secondary" onClick={() => addQuestionToPaper("mcq")}>
          <Plus className="mr-2 h-4 w-4" />
          Add new question: MCQ
        </Button>
        <Button type="button" variant="secondary" onClick={() => addQuestionToPaper("sba")}>
          <Plus className="mr-2 h-4 w-4" />
          Add new question: SBA
        </Button>
        </Can>
        <Button type="button" variant="outline" onClick={resetForm}>
          Reset
        </Button>
        <Can permission="question_bank.create_ai.add">
        <Button type="button" onClick={saveQuestion} disabled={saving || !questionMode}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {queuedQuestions.length > 1 ? `Save all ${queuedQuestions.length} questions` : "Save question"}
        </Button>
        </Can>
      </div>
      {queuedQuestions.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Question paper preview ({queuedQuestions.length})</div>
              <p className="text-xs text-muted-foreground">
                Check questions to approve their matches or to link when approving/saving an extracted point.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedQuestionIds((prev) =>
                    prev.size === queuedQuestions.length
                      ? new Set()
                      : new Set(queuedQuestions.map((q) => q.id)),
                  );
                }}
              >
                {selectedQuestionIds.size === queuedQuestions.length ? "Deselect all" : "Select all"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void approveSelectedQuestionMatches()}
                disabled={
                  !queuedQuestions.some(
                    (q) => selectedQuestionIds.has(q.id) && q.match?.key_point_id && !q.matchApproved,
                  )
                }
              >
                Approve selected matches
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {queuedQuestions.map((q, idx) => (
              <div
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() => selectQueuedQuestion(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectQueuedQuestion(idx);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md border p-3 transition",
                  idx === activeQuestionIndex ? "border-primary bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Checkbox
                    checked={selectedQuestionIds.has(q.id)}
                    onCheckedChange={() => toggleQuestionSelected(q.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select question ${idx + 1}`}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {idx + 1}. {q.questionMode.toUpperCase()} - {q.concept || "Untitled concept"}
                      {q.match ? (
                        <Badge variant="outline" className="ml-2 font-normal">
                          {matchPct(q.match)}% match
                          {q.matchApproved ? " ✓" : ""}
                        </Badge>
                      ) : null}
                      {q.sourcePointId && !q.matchApproved ? (
                        <Badge variant="secondary" className="ml-2 font-normal text-[10px]">
                          Linked to point
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {q.mcq?.stem || q.sba?.stem || "No stem"}
                    </div>
                    {q.match && matchPath(q.match) ? (
                      <div className="truncate text-[11px] text-muted-foreground">{matchPath(q.match)}</div>
                    ) : null}
                    {boardNamesForIds(q.boardIds ?? []).length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {boardNamesForIds(q.boardIds ?? []).map((b) => (
                          <Badge key={b} variant="outline" className="text-[10px]">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!guardPermission("question_bank.create_ai.delete")) return;
                    setDeleteQuestionTarget(q);
                  }}
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteQuestionTarget)}
        onOpenChange={(open) => !open && setDeleteQuestionTarget(null)}
        title="Delete draft question?"
        description={
          deleteQuestionTarget ? (
            <>
              <strong>{deleteQuestionTarget.concept || "Untitled"}</strong> ({deleteQuestionTarget.questionMode.toUpperCase()}) will be removed from the queue.
            </>
          ) : null
        }
        onConfirm={() => {
          if (!deleteQuestionTarget) return;
          const removedId = deleteQuestionTarget.id;
          setQueuedQuestions((prev) => prev.filter((item) => item.id !== removedId));
          setSelectedQuestionIds((prev) => {
            if (!prev.has(removedId)) return prev;
            const next = new Set(prev);
            next.delete(removedId);
            return next;
          });
          setDeleteQuestionTarget(null);
        }}
      />

      <ConceptPickerDialog
        open={conceptPickerOpen}
        onOpenChange={setConceptPickerOpen}
        selectedId={selectedConceptId}
        filters={{
          subject: taxonomy.subjectName || undefined,
          system: taxonomy.systemName || undefined,
          chapter: taxonomy.chapterName || undefined,
          topic: taxonomy.topicName || undefined,
          topicId: taxonomy.topicId || undefined,
        }}
        onSelect={(c) => void selectExistingConcept(c)}
      />

      <ConceptDetailsDialog
        open={conceptDetailsOpen}
        onOpenChange={setConceptDetailsOpen}
        conceptName={conceptDetailsName}
        detail={conceptDetailsData}
        keyPoints={conceptDetailsKeyPoints}
        loading={conceptDetailsLoading}
      />
    </div>
  );
}
