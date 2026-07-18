import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CKEditorField } from "@/components/CKEditorField";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { htmlToPlainText, isHtmlEmpty } from "@/lib/htmlContent";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Save, Sparkles, FileText, FileSpreadsheet, ClipboardCopy, FileJson } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { emptyTaxonomySelection, type TaxonomySelection } from "@/lib/taxonomy";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailCard } from "@/components/ConceptDetailCard";
import { ConceptSuggestionsPanel } from "@/components/ConceptSuggestionsPanel";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import {
  ACCEPTED_SOURCE_TYPES,
  fileFromPasteEvent,
  isAcceptedSourceFile,
  isPdfFile,
  prepareSourceFileForUpload,
  readFilePreview,
} from "@/lib/sourceInput";
import {
  buildExternalKeyPointsCsvPrompt,
  buildExternalKeyPointsJsonPrompt,
  parseKeyPointsCsv,
  parseKeyPointsJson,
  readCsvFileAsText,
} from "@/lib/bulkKeyPointsCsv";
import { fetchSuggestionMatches, type SuggestionMatch } from "@/lib/suggestionMatch";
import { Can, useCan } from "@/components/Can";
import { guardPermission } from "@/lib/permissionGuard";
import { getAuthHeaders } from "@/lib/auth";
import {
  buildSuggestionLines,
  conceptDetailFromSourceHtml,
  conceptDetailToSavePayload,
  emptyConceptDetail,
  resolveBodyHtml,
  type ConceptDetail,
} from "@/lib/conceptDetail";

type KeyPoint = { content: string };

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

const emptyKeyPoint = (): KeyPoint => ({ content: "" });

const Index = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [importingJson, setImportingJson] = useState(false);
  const [matching, setMatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection());
  const [conceptName, setConceptName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [conceptDetail, setConceptDetail] = useState<ConceptDetail>(emptyConceptDetail());
  const [points, setPoints] = useState<KeyPoint[]>([emptyKeyPoint()]);
  const [suggestionLines, setSuggestionLines] = useState<string[]>([]);
  const [suggestionMatches, setSuggestionMatches] = useState<Map<string, SuggestionMatch | null>>(new Map());
  const [deletePointIndex, setDeletePointIndex] = useState<number | null>(null);
  const [sourceEditorOpen, setSourceEditorOpen] = useState(false);

  const canUpload = useCan("home.upload");
  const canBulkCsv = useCan("home.bulk_csv");
  const canSourceText = useCan("home.source_text");
  const canExtract = useCan("home.extract");
  const canEdit = useCan("home.edit");
  const canAdd = useCan("home.add");
  const canDelete = useCan("home.delete");
  const canMatch = useCan("home.match");

  const applySourceText = (html: string) => {
    if (!canSourceText) return;
    setSourceText(html);
    setConceptDetail((prev) =>
      conceptDetailFromSourceHtml(html, {
        storyHtml: prev.storyHtml,
        verbatimText: prev.verbatimText,
      }),
    );
  };

  const applyConceptDetail = (updater: ConceptDetailUpdater) => {
    setConceptDetail((prev) => {
      const next = updater(prev);
      setSourceText(resolveBodyHtml(next));
      return next;
    });
  };

  const requireTaxonomy = () => {
    if (!taxonomy.subjectId || !taxonomy.systemId || !taxonomy.chapterId || !taxonomy.topicId) {
      toast.error("Select subject, system, chapter, and topic");
      return false;
    }
    return true;
  };

  const onPick = async (f: File) => {
    if (!guardPermission("home.upload")) return;
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
      await onPick(f);
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
    if (f) onPick(f);
  };

  const runSuggestionMatch = async (lines: string[]) => {
    if (!canMatch) {
      setSuggestionLines(lines);
      setSuggestionMatches(new Map());
      return;
    }
    if (!lines.length) {
      setSuggestionLines([]);
      setSuggestionMatches(new Map());
      return;
    }
    setMatching(true);
    try {
      const matches = await fetchSuggestionMatches(lines);
      setSuggestionLines(lines);
      setSuggestionMatches(matches);
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Suggestion matching failed");
      setSuggestionLines(lines);
      setSuggestionMatches(new Map());
    } finally {
      setMatching(false);
    }
  };

  const handleExtract = async (options?: { skipMatching?: boolean }) => {
    if (!guardPermission("home.extract")) return;
    const skipMatching = options?.skipMatching === true;
    if (!imageFile && isHtmlEmpty(sourceText)) {
      return toast.error("Upload an image or paste source text");
    }
    if (imageFile && !guardPermission("home.upload")) return;
    if (!imageFile && !isHtmlEmpty(sourceText) && !canSourceText) {
      return toast.error("No permission to use source text for extract");
    }
    setExtracting(true);
    try {
      const formData = new FormData();
      if (imageFile) {
        const prepared = await prepareSourceFileForUpload(imageFile);
        formData.append("image", prepared);
      }
      if (htmlToPlainText(sourceText)) formData.append("input_text", htmlToPlainText(sourceText));

      const resp = await fetch(apiUrl("/api/extract-concept"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      const name = typeof data.concept_name === "string" ? data.concept_name : "";
      setConceptName(name);

      const extractedPoints = Array.isArray(data.high_yield_points)
        ? data.high_yield_points.map((content: string) => ({ content }))
        : [];
      setPoints(extractedPoints.length ? extractedPoints : [emptyKeyPoint()]);

      // Concept detail = exact source textbox HTML (no AI rewrite / restructure).
      setConceptDetail((prev) =>
        conceptDetailFromSourceHtml(sourceText, {
          storyHtml: prev.storyHtml,
          verbatimText: typeof data.verbatim_text === "string" ? data.verbatim_text : "",
        }),
      );

      if (skipMatching) {
        setSuggestionLines([]);
        setSuggestionMatches(new Map());
        toast.success(`Extracted concept · ${extractedPoints.length} key points (no suggestion matching)`);
      } else {
        const lines = buildSuggestionLines(
          null,
          extractedPoints.map((p) => p.content),
        );
        await runSuggestionMatch(lines);
        toast.success(
          `Extracted concept · ${extractedPoints.length} key points · ${lines.length} suggestion line(s)`,
        );
      }
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const updatePoint = (i: number, content: string) => {
    if (!canEdit) return;
    setPoints((p) => p.map((x, idx) => (idx === i ? { ...x, content } : x)));
  };
  const removePoint = (i: number) => {
    if (!guardPermission("home.delete")) return;
    setPoints((p) => {
      const next = p.filter((_, idx) => idx !== i);
      return next.length ? next : [emptyKeyPoint()];
    });
  };
  const addPoint = () => {
    if (!guardPermission("home.add")) return;
    setPoints((p) => [...p, emptyKeyPoint()]);
  };

  const applyBulkKeyPoints = (points: string[], warnings: string[], sourceLabel: string) => {
    setPoints(points.map((content) => ({ content })));
    setSuggestionLines([]);
    setSuggestionMatches(new Map());
    for (const w of warnings) toast.warning(w);
    toast.success(
      `${sourceLabel} loaded · ${points.length} key points — type concept name, select taxonomy, then Save`,
    );
  };

  const handleBulkCsv = async (file: File) => {
    if (!guardPermission("home.bulk_csv")) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && file.type && !file.type.includes("csv") && !file.type.includes("text")) {
      toast.error("Please choose a .csv file");
      return;
    }
    setImportingCsv(true);
    try {
      const text = await readCsvFileAsText(file);
      const parsed = parseKeyPointsCsv(text);
      applyBulkKeyPoints(parsed.points, parsed.warnings, "CSV");
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "CSV import failed");
    } finally {
      setImportingCsv(false);
      if (csvFileRef.current) csvFileRef.current.value = "";
    }
  };

  const handleBulkJson = (rawOverride?: string) => {
    if (!guardPermission("home.bulk_csv")) return;
    const raw = (rawOverride ?? bulkJsonText).trim();
    if (!raw) {
      toast.error("Paste JSON or upload a .json file first");
      return;
    }
    setImportingJson(true);
    try {
      const parsed = parseKeyPointsJson(raw);
      setBulkJsonText(raw);
      applyBulkKeyPoints(parsed.points, parsed.warnings, "JSON");
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "JSON import failed");
    } finally {
      setImportingJson(false);
      if (jsonFileRef.current) jsonFileRef.current.value = "";
    }
  };

  const handleBulkJsonFile = async (file: File) => {
    if (!guardPermission("home.bulk_csv")) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".json") && file.type && !file.type.includes("json") && !file.type.includes("text")) {
      toast.error("Please choose a .json file");
      return;
    }
    try {
      const text = await file.text();
      handleBulkJson(text);
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Failed to read JSON file");
      if (jsonFileRef.current) jsonFileRef.current.value = "";
    }
  };

  const copyKeyPointsExternalPrompt = async (format: "json" | "csv") => {
    try {
      const text =
        format === "csv" ? buildExternalKeyPointsCsvPrompt() : buildExternalKeyPointsJsonPrompt();
      await navigator.clipboard.writeText(text);
      toast.success(
        format === "csv"
          ? "CSV prompt copied — paste into ChatGPT/Claude, then upload the CSV here"
          : "JSON prompt copied — paste JSON into the box or upload .json",
      );
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setIsPdf(false);

    setConceptName("");
    setSourceText("");
    setConceptDetail(emptyConceptDetail());
    setSuggestionLines([]);
    setSuggestionMatches(new Map());
    setTaxonomy(emptyTaxonomySelection());
    setPoints([emptyKeyPoint()]);
    setBulkJsonText("");
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = "";
    if (csvFileRef.current) csvFileRef.current.value = "";
    if (jsonFileRef.current) jsonFileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!guardPermission("home.add")) return;
    if (!requireTaxonomy()) return;
    if (!points.length) return toast.error("No key points to save");
    if (points.some((p) => !p.content.trim())) return toast.error("Empty boxes — fill or remove");
    if (!conceptName.trim()) return toast.error("Concept is required — extract from image or type manually");
    setSaving(true);
    try {
      const resp = await fetch(apiUrl("/api/save-concept"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          concept_name: conceptName.trim(),
          subject: taxonomy.subjectName,
          system: taxonomy.systemName,
          chapter: taxonomy.chapterName,
          topic: taxonomy.topicName,
          topic_id: taxonomy.topicId,
          high_yield_points: points.map((p) => p.content),
          ...conceptDetailToSavePayload(conceptDetail),
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
        embeddings_saved?: number;
        embeddings_missing?: number;
        detail_embedding_saved?: boolean;
      };
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");

      const saved = data?.count ?? points.length;
      const embSaved = data?.embeddings_saved;
      const embMissing = data?.embeddings_missing;
      const detailVec = data?.detail_embedding_saved;

      if (typeof embMissing === "number" && embMissing > 0) {
        toast.warning(`Saved ${saved} points but ${embMissing} embedding(s) failed — check Gemini API keys`);
      } else if (detailVec && typeof embSaved === "number") {
        toast.success(`Saved concept with ${embSaved} key-point vectors + detail vector`);
      } else if (typeof embSaved === "number") {
        toast.success(`Saved ${saved} points with ${embSaved} vector embedding(s)`);
      } else {
        toast.success(`Saved ${saved} points to database`);
      }
      resetForm();
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const taxonomySummary = useMemo(() => {
    const parts = [
      taxonomy.subjectName,
      taxonomy.systemName,
      taxonomy.chapterName,
      taxonomy.topicName,
    ].filter(Boolean);
    return parts.length ? parts.join(" → ") : null;
  }, [taxonomy]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance page-title">Medical Concept Builder</h1>
            <p className="text-muted-foreground mt-1">
             Feauture updated→ create exam → preview exam in Schedule→(next user can attend the exam) .
              {/* Upload a book page → AI extracts concept detail, table, key points → match suggestions with board tags. */}
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href="/suggestions">Suggestions →</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {sourceEditorOpen && canSourceText ? (
          <Card className="p-4 space-y-3 w-full animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Source text editor</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Heading, bold, underline, list, table — সব ফরমেট এখানে সম্পাদনা করুন
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSourceEditorOpen(false)}>
                Close
              </Button>
            </div>
            <CKEditorField
              value={sourceText}
              onChange={applySourceText}
              placeholder="Textbook notes লিখুন — heading, bold, underline, list…"
              minHeight="360px"
              className="w-full"
            />
          </Card>
        ) : null}

        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
        <section className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">AI Extract</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Image, PDF <strong>অথবা</strong> source text দিয়ে extract করুন — concept name ও key points AI তৈরি
                করবে। Concept detail source textbox-এর exact format নিয়ে আসবে (AI rewrite নয়)।
              </p>
            </div>

            <Can permission="home.upload">
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
                "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                canUpload ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                dragOver && canUpload ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
              ].join(" ")}
            >
              <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">ছবি/PDF ড্র্যাগ করুন, ক্লিক করুন।</p>
              <p className="text-xs text-muted-foreground mt-1">Image (JPG, PNG…) অথবা PDF — extract এর জন্য</p>
              <Input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_SOURCE_TYPES}
                className="sr-only"
                disabled={!canUpload}
                onChange={(e) => e.target.files?.[0] && void onPick(e.target.files[0])}
              />
            </div>
            </Can>

            {isPdf && imageFile ? (
              <div className="rounded-md border p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-5 w-5 shrink-0" />
                <span>{imageFile.name}</span>
              </div>
            ) : null}

            {imagePreview && (
              <div className="rounded-md overflow-hidden border">
                <img src={imagePreview} alt="Book page preview" className="w-full" />
              </div>
            )}

            <Can permission="home.source_text">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Source text</Label>
                <Button
                  type="button"
                  variant={sourceEditorOpen ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSourceEditorOpen((open) => !open)}
                >
                  Textbox
                </Button>
              </div>
              {sourceEditorOpen ? (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 text-center">
                  Editor উপরে full width-এ খোলা আছে
                </p>
              ) : !isHtmlEmpty(sourceText) ? (
                <button
                  type="button"
                  onClick={() => setSourceEditorOpen(true)}
                  className="w-full rounded-md border bg-muted/20 p-3 text-left transition hover:bg-muted/40"
                >
                  <RichHtmlContent content={sourceText} />
                  <span className="mt-2 block text-xs text-primary">Textbox ক্লিক করে সম্পাদনা করুন</span>
                </button>
              ) : (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed p-4 text-center">
                  Textbox বাটনে ক্লিক করলে CKEditor 5 editor খুলবে
                </p>
              )}
            </div>
            </Can>

            <Can permission="home.extract">
            <Button
              onClick={() => void handleExtract()}
              disabled={(!imageFile && isHtmlEmpty(sourceText)) || extracting}
              className="w-full"
            >
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract Concept"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExtract({ skipMatching: true })}
              disabled={(!imageFile && isHtmlEmpty(sourceText)) || extracting}
              className="w-full"
            >
              Extract Concept Without Matching
            </Button>
            </Can>
          </Card>

          <Can permission="home.bulk_csv">
            <Card className="p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold">Bulk import (no AI)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  শুধু key points autofill — CSV file <strong>অথবা</strong> JSON text। Concept name UI-তে
                  টাইপ করুন, taxonomy select করে Save।
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">CSV file</Label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => canBulkCsv && !importingCsv && !importingJson && csvFileRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    canBulkCsv &&
                    !importingCsv &&
                    !importingJson &&
                    csvFileRef.current?.click()
                  }
                  className={[
                    "rounded-lg border-2 border-dashed p-4 text-center transition-colors",
                    canBulkCsv && !importingCsv && !importingJson
                      ? "cursor-pointer hover:border-primary/50"
                      : "cursor-not-allowed opacity-50",
                    "border-muted-foreground/30",
                  ].join(" ")}
                >
                  {importingCsv ? (
                    <Loader2 className="mx-auto h-8 w-8 mb-2 text-muted-foreground animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {importingCsv ? "Parsing CSV…" : "CSV আপলোড করুন"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Header: <code className="text-[11px]">key_point</code>
                  </p>
                  <Input
                    ref={csvFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    disabled={!canBulkCsv || importingCsv || importingJson}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleBulkCsv(f);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                    <a href="/samples/home-key-points-bulk.csv" download>
                      Download sample CSV
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void copyKeyPointsExternalPrompt("csv")}
                    disabled={importingJson || importingCsv}
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy CSV prompt
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="home-bulk-json" className="text-xs font-medium text-muted-foreground">
                  JSON text
                </Label>
                <Textarea
                  id="home-bulk-json"
                  value={bulkJsonText}
                  onChange={(e) => canBulkCsv && setBulkJsonText(e.target.value)}
                  readOnly={!canBulkCsv || importingJson || importingCsv}
                  rows={8}
                  className="font-mono text-xs min-h-[120px]"
                  placeholder='{ "key_points": ["Point one", "Point two"] }'
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => handleBulkJson()}
                    disabled={importingJson || importingCsv || !bulkJsonText.trim()}
                  >
                    {importingJson ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4" />
                    )}
                    {importingJson ? "Importing…" : "Import JSON"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={importingJson || importingCsv}
                    onClick={() => jsonFileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload .json
                  </Button>
                  <Input
                    ref={jsonFileRef}
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    disabled={!canBulkCsv || importingJson || importingCsv}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleBulkJsonFile(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void copyKeyPointsExternalPrompt("json")}
                    disabled={importingJson || importingCsv}
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy JSON prompt
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                    <a href="/samples/home-key-points-bulk.json" download>
                      Download sample JSON
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </Can>
        </section>

        <section className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Classification</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Taxonomy select করুন। Board tags এখন প্রতিটি suggestion match-এ দেখাবে।
              </p>
            </div>

            <TaxonomySelects value={taxonomy} onChange={setTaxonomy} required />

            <div className="space-y-2">
              <Label htmlFor="concept-name">Concept *</Label>
              <Input
                id="concept-name"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
                placeholder="Concept title — AI extract বা নিজে টাইপ করুন"
                className={conceptName ? "border-primary/40" : ""}
              />
            </div>

            {taxonomySummary ? (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="text-foreground">{taxonomySummary}</span>
              </p>
            ) : null}
          </Card>

          <ConceptDetailCard
            conceptName={conceptName}
            detail={conceptDetail}
            onOpenDetails={() => setDetailsOpen(true)}
            editable={canEdit}
            onDetailChange={canEdit ? applyConceptDetail : undefined}
          />

          {canMatch ? (
            <ConceptSuggestionsPanel lines={suggestionLines} matches={suggestionMatches} loading={matching} />
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold">Key points</h2>
            <Badge>{points.length} points</Badge>
            {conceptName ? <Badge variant="secondary">Concept ready</Badge> : null}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {points.map((p, i) => (
              <Card key={i} className="p-3 space-y-2 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="tabular-nums">
                    #{i + 1}
                  </Badge>
                  <Can permission="home.delete">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePointIndex(i)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </Can>
                </div>
                <Textarea
                  value={p.content}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  rows={3}
                  className="resize-none"
                  placeholder={`Key point ${i + 1}…`}
                  readOnly={!canEdit}
                />
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Can permission="home.add">
              <Button variant="outline" onClick={addPoint}>
                <Plus className="mr-2 h-4 w-4" /> Add box
              </Button>
            </Can>
            <Can permission="home.add">
            <Button onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? "Saving…" : "Save Concept to Database"}
            </Button>
            </Can>
          </div>
        </section>
        </div>
      </main>

      <ConceptDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conceptName={conceptName}
        detail={conceptDetail}
        keyPoints={[]}
        showKeyPoints={false}
        editable={canEdit}
        onDetailChange={canEdit ? applyConceptDetail : undefined}
      />

      <ConfirmDeleteDialog
        open={deletePointIndex !== null}
        onOpenChange={(open) => !open && setDeletePointIndex(null)}
        title="Delete key point?"
        description={
          deletePointIndex !== null ? (
            <>
              Key point <strong>#{deletePointIndex + 1}</strong> will be removed.
            </>
          ) : null
        }
        onConfirm={() => {
          if (deletePointIndex !== null) {
            removePoint(deletePointIndex);
            setDeletePointIndex(null);
          }
        }}
      />
    </div>
  );
};

export default Index;
