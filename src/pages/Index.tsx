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
import { Loader2, Plus, Trash2, Upload, Save, Sparkles, FileText } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { emptyTaxonomySelection, type TaxonomySelection } from "@/lib/taxonomy";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailCard } from "@/components/ConceptDetailCard";
import { ConceptSuggestionsPanel } from "@/components/ConceptSuggestionsPanel";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import {
  ACCEPTED_SOURCE_TYPES,
  fileFromPasteEvent,
  isAcceptedSourceFile,
  isPdfFile,
  prepareSourceFileForUpload,
  readFilePreview,
} from "@/lib/sourceInput";
import { fetchSuggestionMatches, type SuggestionMatch } from "@/lib/suggestionMatch";
import {
  buildSuggestionLines,
  emptyConceptDetail,
  parseDetailTable,
  type ConceptDetail,
} from "@/lib/conceptDetail";

type KeyPoint = { content: string };

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

const emptyKeyPoint = (): KeyPoint => ({ content: "" });

const Index = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);
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

  const requireTaxonomy = () => {
    if (!taxonomy.subjectId || !taxonomy.systemId || !taxonomy.chapterId || !taxonomy.topicId) {
      toast.error("Select subject, system, chapter, and topic");
      return false;
    }
    return true;
  };

  const onPick = async (f: File) => {
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

  const handleExtract = async () => {
    if (!imageFile && isHtmlEmpty(sourceText)) {
      return toast.error("Upload an image or paste source text");
    }
    setExtracting(true);
    try {
      const formData = new FormData();
      if (imageFile) {
        const prepared = await prepareSourceFileForUpload(imageFile);
        formData.append("image", prepared);
      }
      if (htmlToPlainText(sourceText)) formData.append("input_text", htmlToPlainText(sourceText));

      const resp = await fetch(apiUrl("/api/extract-concept"), { method: "POST", body: formData });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      const name = typeof data.concept_name === "string" ? data.concept_name : "";
      setConceptName(name);

      const extractedPoints = Array.isArray(data.high_yield_points)
        ? data.high_yield_points.map((content: string) => ({ content }))
        : [];
      setPoints(extractedPoints.length ? extractedPoints : [emptyKeyPoint()]);

      const detail: ConceptDetail = {
        summary: typeof data.detail_summary === "string" ? data.detail_summary : "",
        paragraphs: Array.isArray(data.detail_paragraphs)
          ? data.detail_paragraphs.filter((p: unknown): p is string => typeof p === "string")
          : [],
        table: parseDetailTable(data.detail_table),
        verbatimText: typeof data.verbatim_text === "string" ? data.verbatim_text : "",
      };
      setConceptDetail(detail);

      const lines = buildSuggestionLines(
        detail.table,
        extractedPoints.map((p) => p.content),
      );
      await runSuggestionMatch(lines);

      toast.success(
        `Extracted concept · ${extractedPoints.length} key points · ${lines.length} suggestion line(s)`,
      );
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const updatePoint = (i: number, content: string) =>
    setPoints((p) => p.map((x, idx) => (idx === i ? { ...x, content } : x)));
  const removePoint = (i: number) =>
    setPoints((p) => {
      const next = p.filter((_, idx) => idx !== i);
      return next.length ? next : [emptyKeyPoint()];
    });
  const addPoint = () => setPoints((p) => [...p, emptyKeyPoint()]);

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
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!requireTaxonomy()) return;
    if (!points.length) return toast.error("No key points to save");
    if (points.some((p) => !p.content.trim())) return toast.error("Empty boxes — fill or remove");
    if (!conceptName.trim()) return toast.error("Concept is required — extract from image or type manually");
    setSaving(true);
    try {
      const resp = await fetch(apiUrl("/api/save-concept"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept_name: conceptName.trim(),
          subject: taxonomy.subjectName,
          system: taxonomy.systemName,
          chapter: taxonomy.chapterName,
          topic: taxonomy.topicName,
          topic_id: taxonomy.topicId,
          high_yield_points: points.map((p) => p.content),
          detail_summary: conceptDetail.summary || null,
          detail_paragraphs: conceptDetail.paragraphs,
          detail_table: conceptDetail.table,
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

  const keyPointTexts = useMemo(() => points.map((p) => p.content.trim()).filter(Boolean), [points]);

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
        {sourceEditorOpen ? (
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
              onChange={setSourceText}
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
                Image, pdf <strong>অথবা</strong> source text দিয়ে extract করুন। Concept detail, table, key points ও
                suggestions match একসাথে আসবে।
              </p>
            </div>

            <div
              role="button"
              tabIndex={0}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onPaste={onPaste}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className={[
                "rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
              ].join(" ")}
            >
              <Upload className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">ছবি/PDF ড্র্যাগ করুন, ক্লিক করুন।</p>
              <p className="text-xs text-muted-foreground mt-1">Image (JPG, PNG…) অথবা PDF</p>
              <Input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_SOURCE_TYPES}
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && void onPick(e.target.files[0])}
              />
            </div>

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

            <Button
              onClick={handleExtract}
              disabled={(!imageFile && isHtmlEmpty(sourceText)) || extracting}
              className="w-full"
            >
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract Concept"}
            </Button>
          </Card>
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
                placeholder="Concept title — AI extract করলে auto-fill, নাহলে নিজে টাইপ করুন"
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
          />

          <ConceptSuggestionsPanel lines={suggestionLines} matches={suggestionMatches} loading={matching} />

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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePointIndex(i)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={p.content}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  rows={3}
                  className="resize-none"
                  placeholder={`Key point ${i + 1}…`}
                />
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={addPoint}>
              <Plus className="mr-2 h-4 w-4" /> Add box
            </Button>
            <Button onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? "Saving…" : "Save Concept to Database"}
            </Button>
          </div>
        </section>
        </div>
      </main>

      <ConceptDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conceptName={conceptName}
        detail={conceptDetail}
        keyPoints={keyPointTexts}
        editable
        onDetailChange={setConceptDetail}
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
