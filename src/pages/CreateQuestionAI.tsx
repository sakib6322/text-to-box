import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MultiLineField } from "@/components/MultiLineField";
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
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import { emptyConceptDetail, fetchConceptById, type ConceptDetail } from "@/lib/conceptDetail";

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

type SuggestionMatch = {
  key_point_id: string;
  concept_id?: string | null;
  similarity: number;
  concept_title: string | null;
  concept_subject?: string | null;
  concept_system?: string | null;
  concept_chapter?: string | null;
  concept_topic?: string | null;
  board_names?: string[];
  ai_percentage?: number | null;
  ai_reason?: string | null;
  vector_percentage?: number;
};

type ApprovedPoint = {
  point_id: string;
  text: string;
  approved: boolean;
  saving?: boolean;
  approveError?: string | null;
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

function questionStem(q: Pick<DraftQuestion, "mcq" | "sba">): string {
  return (q.mcq?.stem ?? q.sba?.stem ?? "").trim();
}

function matchPct(m: SuggestionMatch): number {
  return Math.round((m.ai_percentage ?? m.similarity * 100));
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: drafts, concept: concept?.trim() || undefined }),
  });
  const j = (await resp.json().catch(() => ({}))) as {
    results?: GeneratedExplanationResult[];
    error?: string;
  };
  if (!resp.ok) throw new Error(j.error ?? "Explanation generation failed");
  return mergeExplanationResults(drafts, j.results ?? []);
}

async function fetchSuggestionMatches(texts: string[]): Promise<Map<string, SuggestionMatch | null>> {
  const bestByText = new Map<string, SuggestionMatch | null>();
  const list = texts.filter((t) => t.trim());
  if (list.length === 0) return bestByText;

  const resp = await fetch(apiUrl("/api/match-key-points"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: list.slice(0, 30), threshold: 0.55, count: 1 }),
  });
  type Match = {
    id: string;
    concept_id?: string | null;
    similarity: number;
    concept_title: string | null;
    concept_subject?: string | null;
    concept_system?: string | null;
    concept_chapter?: string | null;
    concept_topic?: string | null;
    board_names?: string[];
    ai_percentage?: number;
    ai_reason?: string | null;
    vector_percentage?: number;
  };
  type MatchResult = { text: string; matches: Match[] };
  const j = (await resp.json().catch(() => ({}))) as { results?: MatchResult[]; error?: string };
  if (!resp.ok) throw new Error(j.error ?? "Match failed");

  for (const r of j.results ?? []) {
    const best = Array.isArray(r?.matches) && r.matches.length ? r.matches[0] : null;
    if (typeof r?.text !== "string") continue;
    if (!best?.id || typeof best.similarity !== "number") {
      bestByText.set(r.text, null);
      continue;
    }
    bestByText.set(r.text, {
      key_point_id: best.id,
      concept_id: best.concept_id ?? null,
      similarity: best.similarity,
      concept_title: best.concept_title ?? null,
      concept_subject: best.concept_subject ?? null,
      concept_system: best.concept_system ?? null,
      concept_chapter: best.concept_chapter ?? null,
      concept_topic: best.concept_topic ?? null,
      board_names: Array.isArray(best.board_names) ? best.board_names.filter(Boolean) : [],
      ai_percentage: typeof best.ai_percentage === "number" ? best.ai_percentage : null,
      ai_reason: typeof best.ai_reason === "string" ? best.ai_reason : null,
      vector_percentage: typeof best.vector_percentage === "number" ? best.vector_percentage : undefined,
    });
  }
  return bestByText;
}

function SuggestionMatchPanel({
  match,
  matchApproved,
  matchApproving,
  matchApproveError,
  selectedBoardNames,
  onApprove,
  onViewConcept,
  allowApproveWithoutMatch = false,
}: {
  match: SuggestionMatch | null | undefined;
  matchApproved?: boolean;
  matchApproving?: boolean;
  matchApproveError?: string | null;
  selectedBoardNames?: string[];
  onApprove?: () => void;
  onViewConcept?: () => void;
  allowApproveWithoutMatch?: boolean;
}) {
  if (!match) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
        <p>No matching suggestion in database yet.</p>
        {selectedBoardNames?.length ? (
          <div className="flex flex-wrap gap-1">
            {selectedBoardNames.map((b) => (
              <Badge key={b} variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50">
                {b}
              </Badge>
            ))}
          </div>
        ) : null}
        {onApprove && !matchApproved && allowApproveWithoutMatch ? (
          <Button type="button" size="sm" className="h-7 text-xs" onClick={onApprove} disabled={matchApproving}>
            {matchApproving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Approve as new suggestion
          </Button>
        ) : null}
        {matchApproveError ? <p className="text-destructive">{matchApproveError}</p> : null}
      </div>
    );
  }
  const path = matchPath(match);
  const boards = [
    ...new Set([...(match.board_names ?? []), ...(selectedBoardNames ?? [])].filter(Boolean)),
  ];
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-foreground">Suggestion match:</span> {matchPct(match)}%
          {matchApproved ? (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              Approved
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {onViewConcept && match.concept_id ? (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onViewConcept}>
              Concept details
            </Button>
          ) : null}
          {onApprove && !matchApproved ? (
            <Button type="button" size="sm" className="h-7 text-xs" onClick={onApprove} disabled={matchApproving}>
              {matchApproving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {allowApproveWithoutMatch ? "Approve" : "Approve match"}
            </Button>
          ) : null}
        </div>
      </div>
      {path ? (
        <p>
          <span className="font-medium text-foreground">Path:</span> {path}
        </p>
      ) : null}
      {boards.length ? (
        <div className="flex flex-wrap gap-1">
          {boards.map((b) => (
            <Badge key={b} variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50">
              {b}
            </Badge>
          ))}
        </div>
      ) : null}
      {typeof match.vector_percentage === "number" ? (
        <p>
          <span className="font-medium text-foreground">Vector score:</span> {Math.round(match.vector_percentage)}%
        </p>
      ) : null}
      <p className="font-mono">Key point ID: {match.key_point_id}</p>
      {match.ai_reason ? (
        <p>
          <span className="font-medium text-foreground">Analysis:</span> {match.ai_reason}
        </p>
      ) : null}
      {matchApproveError ? <p className="text-destructive">{matchApproveError}</p> : null}
      {!matchApproved && onApprove ? (
        <p className="text-[11px]">
          {allowApproveWithoutMatch
            ? "Approve to save as suggestion with selected boards (not as a question)."
            : "Approve this match to link the suggestion and apply selected boards before saving."}
        </p>
      ) : null}
    </div>
  );
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });

  const MAX_SIDE = 1600;
  const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.78);
  });
  if (!blob) return file;

  const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return compressed.size < file.size ? compressed : file;
}

export default function CreateQuestionAI() {
  const [conceptTitle, setConceptTitle] = useState("");
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection());

  const [enableBijoyPaste, setEnableBijoyPaste] = useState(false);
  const [enableHelper, setEnableHelper] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [points, setPoints] = useState<ApprovedPoint[]>([]);

  const [questionMode, setQuestionMode] = useState<QuestionMode>(null);

  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [importantSchools, setImportantSchools] = useState([""]);
  const [sources, setSources] = useState([""]);
  const [teachers, setTeachers] = useState([""]);
  const [tags, setTags] = useState([""]);
  const [difficulty, setDifficulty] = useState("medium");
  const [status, setStatus] = useState("published");
  const [marks, setMarks] = useState("1");

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
  const [conceptDetailsOpen, setConceptDetailsOpen] = useState(false);
  const [conceptDetailsLoading, setConceptDetailsLoading] = useState(false);
  const [conceptDetailsName, setConceptDetailsName] = useState("");
  const [conceptDetailsData, setConceptDetailsData] = useState<ConceptDetail>(emptyConceptDetail());
  const [conceptDetailsKeyPoints, setConceptDetailsKeyPoints] = useState<string[]>([]);
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

  const selectedBoardNames = useMemo(() => {
    const byId = new Map(boardOptions.map((b) => [b.id, b.name]));
    return selectedBoardIds.map((id) => byId.get(id)).filter((n): n is string => Boolean(n?.trim()));
  }, [boardOptions, selectedBoardIds]);

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

  const toggleBoard = (id: string) => {
    setSelectedBoardIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyAutofillFromExtract = (extracted: ExtractResult) => {
    setConceptTitle(extracted.concept_name);
  };

  const buildMetadata = (): DraftQuestion["metadata"] => ({
    boards: selectedBoardNames,
    importantSchools: importantSchools.map((b) => b.trim()).filter(Boolean),
    sources: sources.map((b) => b.trim()).filter(Boolean),
    teachers: teachers.map((b) => b.trim()).filter(Boolean),
    tags: tags.map((b) => b.trim()).filter(Boolean),
    difficulty,
    status,
    marks: Number(marks) || 0,
  });

  const loadQuestionIntoForm = (q: DraftQuestion) => {
    setQuestionMode(q.questionMode);
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
        metadata: buildMetadata(),
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
      metadata: buildMetadata(),
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
      const bestByText = await fetchSuggestionMatches(stems);
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
    loadQuestionIntoForm(drafts[0]);

    const mcqCount = questions.filter((q) => q.question_type === "mcq").length;
    const sbaCount = questions.filter((q) => q.question_type === "sba").length;
    const parts = [];
    if (mcqCount) parts.push(`${mcqCount} MCQ`);
    if (sbaCount) parts.push(`${sbaCount} SBA`);
    setExtractedQuestionSummary(parts.join(", "));
  };

  const onPickImage = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
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

  const applyExtractedPoints = async (texts: string[]) => {
    const initial: ApprovedPoint[] = texts.map((text) => ({
      point_id: mkId(),
      text,
      approved: false,
      approveError: null,
      match: null,
      matching: true,
    }));
    setPoints(initial);

    try {
      const bestByText = await fetchSuggestionMatches(texts);
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

  const handleExtract = async () => {
    if (!imageFile && !sourceText.trim()) return toast.error("Please upload image or paste text");
    setExtracting(true);
    setExtractedQuestionSummary(null);
    try {
      const formData = new FormData();
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        formData.append("image", compressed);
      }
      if (sourceText.trim()) formData.append("input_text", sourceText.trim());

      const [conceptResp, questionsResp] = await Promise.all([
        fetch(apiUrl("/api/extract-concept"), { method: "POST", body: formData }),
        fetch(apiUrl("/api/extract-questions"), { method: "POST", body: formData }),
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
      void applyExtractedPoints(extracted.high_yield_points);
      applyAutofillFromExtract(extracted);
      await applyExtractedQuestions(extractedQuestions, extracted.concept_name);
      const questionMsg =
        extractedQuestions.length > 0
          ? ` · ${extractedQuestions.length} question${extractedQuestions.length > 1 ? "s" : ""} (verbatim MCQ/SBA)`
          : "";
      toast.success(`Extracted ${extracted.high_yield_points.length} points${questionMsg}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const approvePoint = async (idx: number) => {
    const p = points[idx];
    if (!p) return;
    if (!requireTaxonomy()) return;
    const t = taxonomyNames();
    const text = p.text.trim();
    if (!text) return toast.error("Point text is required");
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: true, approveError: null } : x)));
    try {
      const resp = await fetch(apiUrl("/api/approve-point"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched_key_point_id: p.match?.key_point_id ?? null,
          concept: conceptTitle,
          subject: t.subject,
          system: t.system,
          chapter: t.chapter,
          topic: t.topic,
          topic_id: t.topicId,
          question_text: text,
          board_ids: selectedBoardIds,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string; created_new_point?: boolean; point_id?: string };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Approval failed");

      setPoints((ps) =>
        ps.map((x, i) =>
          i === idx
            ? {
                ...x,
                approved: true,
                saving: false,
                approveError: null,
                point_id: typeof data?.point_id === "string" ? data.point_id : x.point_id,
              }
            : x,
        ),
      );
      toast.success(
        data.created_new_point
          ? "Added as new suggestion (with boards if selected)"
          : "Suggestion approved — linked with selected boards",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      toast.error(msg);
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: false, approveError: msg } : x)));
    }
  };

  const refreshPointMatch = async (idx: number) => {
    const p = points[idx];
    if (!p?.text.trim()) return;
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, matching: true } : x)));
    try {
      const bestByText = await fetchSuggestionMatches([p.text.trim()]);
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
      const loaded = await fetchConceptById(match.concept_id);
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

  const approveQuestionMatch = async (index: number) => {
    const q = index === activeQuestionIndex ? buildCurrentDraftFromForm() : queuedQuestions[index];
    if (!q?.match?.key_point_id) return;
    if (!requireTaxonomy()) return;
    const t = taxonomyNames();
    const stem = questionStem(q);
    if (!stem) return toast.error("Question stem is required to approve match");

    setQueuedQuestions((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, matchApproving: true, matchApproveError: null } : item,
      ),
    );
    try {
      const resp = await fetch(apiUrl("/api/approve-point"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched_key_point_id: q.match!.key_point_id,
          concept: q.concept || conceptTitle,
          subject: t.subject,
          system: t.system,
          chapter: t.chapter,
          topic: t.topic,
          topic_id: t.topicId,
          question_text: stem,
          board_ids: selectedBoardIds,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string; point_id?: string };
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
      toast.success("Match approved — boards linked to suggestion");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      setQueuedQuestions((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, matchApproving: false, matchApproveError: msg } : item,
        ),
      );
      toast.error(msg);
    }
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
    setImportantSchools([""]);
    setSources([""]);
    setTeachers([""]);
    setTags([""]);
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
    setExtractedQuestionSummary(null);
    setSourceText("");
    setConceptTitle("");
    setTaxonomy(emptyTaxonomySelection());
  };

  const generateExplanationsAi = async () => {
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
    if (!questionMode) return toast.error("Select a question type");
    if (!requireTaxonomy()) return;
    const toSave = questionsForSave();
    const pendingMatch = toSave.find((q) => q.match && !q.matchApproved);
    if (pendingMatch) {
      return toast.error("Approve suggestion match for each question before saving");
    }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");
      toast.success(`${payload.questions.length} question saved`);
      setQueuedQuestions([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addQuestionToPaper = (mode: "mcq" | "sba" = questionMode as "mcq" | "sba") => {
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
      metadata: {
        boards: selectedBoardNames,
        importantSchools: importantSchools.map((b) => b.trim()).filter(Boolean),
        sources: sources.map((b) => b.trim()).filter(Boolean),
        teachers: teachers.map((b) => b.trim()).filter(Boolean),
        tags: tags.map((b) => b.trim()).filter(Boolean),
        difficulty,
        status,
        marks: Number(marks) || 0,
      },
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
      metadata: buildMetadata(),
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
          : draft.match
            ? null
            : draft.sourcePointId;
      return { ...draft, sourcePointId, metadata: { ...draft.metadata, boards: selectedBoardNames } };
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
            <Input value={conceptTitle} onChange={(e) => setConceptTitle(e.target.value)} placeholder="Concept title" />
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
          <div className="space-y-2">
            <Label>Book page image</Label>
            <div
              role="button"
              tabIndex={0}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className={[
                "rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors max-w-md",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
              ].join(" ")}
            >
              <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">ছবি ড্র্যাগ করুন বা ক্লিক করুন</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG…</p>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0])}
              />
            </div>
            {imagePreview ? (
              <div className="max-w-md rounded-md overflow-hidden border">
                <img src={imagePreview} alt="Upload preview" className="w-full" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExtract} disabled={(!imageFile && !sourceText.trim()) || extracting} type="button">
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract concept"}
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Source text (Text to concept generator)</Label>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={5}
            className="resize-y"
          />
        </div>
      </Card>

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
                    Match against suggestions (subject → system → chapter → topic → concept → board), then approve each line.
                    Only MCQ/SBA questions go to All Questions — not these points.
                  </div>
                </div>
                <Badge variant="outline">
                  {points.filter((p) => p.approved).length}/{points.length} approved
                </Badge>
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
                        matchApproving={p.saving}
                        matchApproveError={p.approveError}
                        selectedBoardNames={selectedBoardNames}
                        onApprove={() => approvePoint(idx)}
                        onViewConcept={p.match ? () => void openMatchConceptDetails(p.match!) : undefined}
                        allowApproveWithoutMatch
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
            <Label>Boards</Label>
            <p className="text-xs text-muted-foreground">
              Create subject, system, chapter, topic, and boards in Admin → Settings before saving questions.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border p-3">
              {boardOptions.length === 0 ? (
                <span className="text-sm text-muted-foreground">No boards yet. Add them in Settings.</span>
              ) : (
                boardOptions.map((b) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={selectedBoardIds.includes(b.id)} onCheckedChange={() => toggleBoard(b.id)} />
                    {b.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <MultiLineField label="Important schools (multi)" values={importantSchools} onChange={setImportantSchools} />
          <MultiLineField label="Sources (multi)" values={sources} onChange={setSources} />
          <MultiLineField label="Teachers (multi)" values={teachers} onChange={setTeachers} />
          <MultiLineField label="Tags (multi)" values={tags} onChange={setTags} />
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
            {queuedQuestions.some((q) => q.match) ? " · approve each match before save" : null}
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
        <Button type="button" variant="secondary" onClick={() => addQuestionToPaper("mcq")}>
          <Plus className="mr-2 h-4 w-4" />
          Add new question: MCQ
        </Button>
        <Button type="button" variant="secondary" onClick={() => addQuestionToPaper("sba")}>
          <Plus className="mr-2 h-4 w-4" />
          Add new question: SBA
        </Button>
        <Button type="button" variant="outline" onClick={resetForm}>
          Reset
        </Button>
        <Button type="button" onClick={saveQuestion} disabled={saving || !questionMode}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save question
        </Button>
      </div>
      {queuedQuestions.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Question paper preview ({queuedQuestions.length})</div>
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
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {idx + 1}. {q.questionMode.toUpperCase()} - {q.concept || "Untitled concept"}
                    {q.match ? (
                      <Badge variant="outline" className="ml-2 font-normal">
                        {matchPct(q.match)}% match
                        {q.matchApproved ? " ✓" : ""}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {q.mcq?.stem || q.sba?.stem || "No stem"}
                  </div>
                  {q.match && matchPath(q.match) ? (
                    <div className="truncate text-[11px] text-muted-foreground">{matchPath(q.match)}</div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteQuestionTarget(q);
                  }}
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
          setQueuedQuestions((prev) => prev.filter((item) => item.id !== deleteQuestionTarget.id));
          setDeleteQuestionTarget(null);
        }}
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
