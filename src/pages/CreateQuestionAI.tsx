import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MultiLineField } from "@/components/MultiLineField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type ExtractResult = {
  concept_name: string;
  high_yield_points: string[];
};

type ApprovedPoint = {
  point_id: string;
  text: string;
  approved: boolean;
  saving?: boolean;
};

type TfItem = {
  id: string;
  statement: string;
  /** correct answer for this True/False sub-question */
  correct: "true" | "false";
};

type QuestionMode = "mcq" | "sba" | null;
type DraftQuestion = {
  id: string;
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  topic: string;
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
  sba: { stem: string; options: string[]; correctIndex: number } | null;
  sourcePointId: string | null;
};

const mkId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function CreateQuestionAI() {
  const [conceptTitle, setConceptTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [system, setSystem] = useState("");
  const [topic, setTopic] = useState("");

  const [enableBijoyPaste, setEnableBijoyPaste] = useState(false);
  const [enableHelper, setEnableHelper] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [points, setPoints] = useState<ApprovedPoint[]>([]);

  const [questionMode, setQuestionMode] = useState<QuestionMode>(null);

  const [boards, setBoards] = useState([""]);
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
  const [sbaCorrect, setSbaCorrect] = useState<0 | 1 | 2 | 3 | 4>(0);

  const [saving, setSaving] = useState(false);
  const [queuedQuestions, setQueuedQuestions] = useState<DraftQuestion[]>([]);

  const breadcrumb = useMemo(() => {
    const s = (v: string, fallback: string) => (v.trim() ? v.trim() : fallback);
    return [s(subject, "Subject"), s(system, "System"), s(topic, "Topic"), s(conceptTitle, "Concept")];
  }, [subject, system, topic, conceptTitle]);

  const applyAutofillFromExtract = (extracted: ExtractResult) => {
    setConceptTitle(extracted.concept_name);
    const lines = extracted.high_yield_points;
    if (lines.length > 0) {
      setMcqStem(lines[0] ?? "");
      setSbaStem(lines[0] ?? "");
      const nextOpts: [string, string, string, string, string] = ["", "", "", "", ""];
      for (let i = 0; i < 5; i++) nextOpts[i] = lines[i + 1] ?? lines[i] ?? "";
      setSbaOptions(nextOpts);
      setTfItems(
        lines.map((text) => ({
          id: mkId(),
          statement: text,
          correct: "true",
        })),
      );
    } else {
      setMcqStem("");
      setSbaStem("");
      setSbaOptions(["", "", "", "", ""]);
      setTfItems([{ id: mkId(), statement: "", correct: "true" }]);
    }
  };

  const handleExtract = async () => {
    if (!imageFile && !sourceText.trim()) return toast.error("Please upload image or paste text");
    setExtracting(true);
    try {
      const formData = new FormData();
      if (imageFile) formData.append("image", imageFile);
      if (sourceText.trim()) formData.append("input_text", sourceText.trim());
      const resp = await fetch("/api/extract-concept", { method: "POST", body: formData });
      const data = (await resp.json().catch(() => ({}))) as { error?: string; concept_name?: string; high_yield_points?: string[] };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      const extracted: ExtractResult = {
        concept_name: typeof data?.concept_name === "string" ? data.concept_name : "",
        high_yield_points: Array.isArray(data?.high_yield_points) ? data.high_yield_points.filter((x): x is string => typeof x === "string") : [],
      };

      setResult(extracted);
      setPoints(
        extracted.high_yield_points.map((text) => ({
          point_id: mkId(),
          text,
          approved: false,
        })),
      );
      applyAutofillFromExtract(extracted);
      toast.success(`Extracted ${extracted.high_yield_points.length} points`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const approvePoint = async (idx: number) => {
    const p = points[idx];
    if (!p) return;
    setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: true } : x)));
    try {
      const resp = await fetch("/api/approve-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          point_id: p.point_id,
          concept: conceptTitle,
          subject,
          system,
          topic,
          question_text: p.text,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Approval failed");

      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, approved: true, saving: false } : x)));
      toast.success("Approved and saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: false } : x)));
    }
  };

  const addTfQuestion = () => {
    setTfItems((rows) => [...rows, { id: mkId(), statement: "", correct: "true" }]);
  };

  const setTf = (i: number, patch: Partial<TfItem>) => {
    setTfItems((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const setSbaOption = (i: number, v: string) => {
    setSbaOptions((opts) => opts.map((o, j) => (j === i ? v : o)) as [string, string, string, string, string]);
  };

  const resetForm = () => {
    setBoards([""]);
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
    setSbaCorrect(0);
    setQuestionMode(null);
    setResult(null);
    setPoints([]);
    setQueuedQuestions([]);
    setSourceText("");
    setConceptTitle("");
    setSubject("");
    setSystem("");
    setTopic("");
  };

  const saveQuestion = async () => {
    if (!questionMode) return toast.error("Select a question type");
    setSaving(true);
    try {
      const currentQuestion: DraftQuestion = {
        id: mkId(),
        subject,
        system,
        topic,
        concept: conceptTitle,
        questionMode: questionMode as "mcq" | "sba",
        metadata: {
          boards: boards.map((b) => b.trim()).filter(Boolean),
          importantSchools: importantSchools.map((b) => b.trim()).filter(Boolean),
          sources: sources.map((b) => b.trim()).filter(Boolean),
          teachers: teachers.map((b) => b.trim()).filter(Boolean),
          tags: tags.map((b) => b.trim()).filter(Boolean),
          difficulty,
          status,
          marks: Number(marks) || 0,
        },
        mcq: questionMode === "mcq" ? { stem: mcqStem, trueFalse: tfItems } : null,
        sba: questionMode === "sba" ? { stem: sbaStem, options: sbaOptions, correctIndex: sbaCorrect } : null,
        sourcePointId: points.find((p) => p.approved)?.point_id ?? null,
      };
      const payload = {
        source: {
          text: sourceText.trim() || null,
          hasImage: Boolean(imageFile),
        },
        questions: queuedQuestions.length ? queuedQuestions : [currentQuestion],
      };
      const resp = await fetch("/api/save-question", {
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

  const addQuestionToPaper = () => {
    if (!questionMode) return toast.error("Select question type first");
    const next: DraftQuestion = {
      id: mkId(),
      questionMode: questionMode as "mcq" | "sba",
      subject,
      system,
      topic,
      concept: conceptTitle,
      metadata: {
        boards: boards.map((b) => b.trim()).filter(Boolean),
        importantSchools: importantSchools.map((b) => b.trim()).filter(Boolean),
        sources: sources.map((b) => b.trim()).filter(Boolean),
        teachers: teachers.map((b) => b.trim()).filter(Boolean),
        tags: tags.map((b) => b.trim()).filter(Boolean),
        difficulty,
        status,
        marks: Number(marks) || 0,
      },
      mcq: questionMode === "mcq" ? { stem: mcqStem, trueFalse: tfItems } : null,
      sba: questionMode === "sba" ? { stem: sbaStem, options: sbaOptions, correctIndex: sbaCorrect } : null,
      sourcePointId: points.find((p) => p.approved)?.point_id ?? null,
    };
    setQueuedQuestions((prev) => [...prev, next]);
    toast.success("Question added to paper");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Create Question</h1>
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Concept *</Label>
            <Input value={conceptTitle} onChange={(e) => setConceptTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>System *</Label>
            <Input value={system} onChange={(e) => setSystem(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Topic *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={enableBijoyPaste} onCheckedChange={(v) => setEnableBijoyPaste(Boolean(v))} />
              Enable Bijoy Paste
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={enableHelper} onCheckedChange={(v) => setEnableHelper(Boolean(v))} />
              Enable Helper
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              className="max-w-[220px] cursor-pointer"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
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
                setTfItems((rows) => (rows.length > 0 ? rows : [{ id: mkId(), statement: "", correct: "true" }]));
              }}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                questionMode === "mcq" ? "border-sky-600 bg-sky-50 dark:bg-sky-950/30" : "hover:bg-muted/50",
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
                questionMode === "sba" ? "border-sky-600 bg-sky-50 dark:bg-sky-950/30" : "hover:bg-muted/50",
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
                  <div className="text-xs text-muted-foreground">Approve each to increment line count and store in the database.</div>
                </div>
                <Badge variant="outline">
                  {points.filter((p) => p.approved).length}/{points.length} approved
                </Badge>
              </div>
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {points.map((p, idx) => (
                  <Card key={p.point_id} className="p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <Textarea
                          value={p.text}
                          onChange={(e) => setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))}
                          rows={2}
                          className="resize-none"
                        />
                        <div className="mt-1 font-mono text-xs text-muted-foreground">{p.point_id.slice(0, 10)}…</div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => approvePoint(idx)}
                        disabled={p.approved || p.saving}
                        className="shrink-0"
                        size="sm"
                      >
                        {p.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {p.approved ? "Approved" : "Approve"}
                      </Button>
                    </div>
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
          <MultiLineField label="Boards (multi)" values={boards} onChange={setBoards} />
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

        {questionMode === "mcq" ? (
          <div className="mt-8 space-y-4 border-t pt-6">
            <div className="text-sm font-medium text-sky-900 dark:text-sky-100">MCQ</div>
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
            <div className="text-sm font-medium text-sky-900 dark:text-sky-100">SBA (single best answer)</div>
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
        <Button type="button" variant="secondary" onClick={addQuestionToPaper} disabled={!questionMode}>
          <Plus className="mr-2 h-4 w-4" />
          Add question
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
              <div key={q.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {idx + 1}. {q.questionMode.toUpperCase()} - {q.concept || "Untitled concept"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {q.mcq?.stem || q.sba?.stem || "No stem"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setQueuedQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
