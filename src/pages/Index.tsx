import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Save, Sparkles } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { emptyTaxonomySelection, type TaxonomySelection } from "@/lib/taxonomy";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type KeyPoint = { content: string };
type BoardOption = { id: string; name: string };

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

async function compressImage(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(src);
      reject(err);
    };
    img.src = src;
  });

  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

const Index = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection());
  const [boardOptions, setBoardOptions] = useState<BoardOption[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [conceptName, setConceptName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [points, setPoints] = useState<KeyPoint[]>([]);
  const [deletePointIndex, setDeletePointIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/boards"));
        const j = (await r.json().catch(() => ({}))) as { boards?: BoardOption[] };
        if (cancelled || !r.ok || !Array.isArray(j.boards)) return;
        setBoardOptions(j.boards.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        /* boards optional until settings configured */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleBoard = (id: string) => {
    setSelectedBoardIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const requireTaxonomy = () => {
    if (!taxonomy.subjectId || !taxonomy.systemId || !taxonomy.chapterId || !taxonomy.topicId) {
      toast.error("Select subject, system, chapter, and topic");
      return false;
    }
    return true;
  };

  const onPick = (f: File) => {
    setImageFile(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleExtract = async () => {
    if (!imageFile && !sourceText.trim()) {
      return toast.error("Upload an image or paste source text");
    }
    setExtracting(true);
    try {
      const formData = new FormData();
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        formData.append("image", compressed);
      }
      if (sourceText.trim()) formData.append("input_text", sourceText.trim());

      const resp = await fetch(apiUrl("/api/extract-concept"), { method: "POST", body: formData });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      setConceptName(typeof data.concept_name === "string" ? data.concept_name : "");
      const extractedPoints = Array.isArray(data.high_yield_points)
        ? data.high_yield_points.map((content: string) => ({ content }))
        : [];
      setPoints(extractedPoints);
      toast.success(`Concept auto-filled · ${extractedPoints.length} key points extracted`);
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const updatePoint = (i: number, content: string) =>
    setPoints((p) => p.map((x, idx) => (idx === i ? { ...x, content } : x)));
  const removePoint = (i: number) => setPoints((p) => p.filter((_, idx) => idx !== i));
  const addPoint = () => setPoints((p) => [...p, { content: "" }]);

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setConceptName("");
    setSourceText("");
    setTaxonomy(emptyTaxonomySelection());
    setSelectedBoardIds([]);
    setPoints([]);
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
          board_ids: selectedBoardIds,
          high_yield_points: points.map((p) => p.content),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");

      toast.success(`Saved ${data?.count ?? points.length} points to database`);
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
              Upload a book page → AI extracts exam-oriented key points → verify → save with vector embeddings.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href="/suggestions">Suggestions →</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-[380px_1fr] gap-8">
        <section className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Book page image</label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
              />
            </div>
            {imagePreview && (
              <div className="rounded-md overflow-hidden border">
                <img src={imagePreview} alt="Book page preview" className="w-full" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="source-text">Source text (Text to concept generator)</Label>
              <Textarea
                id="source-text"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={5}
                className="resize-y"
                placeholder="Paste textbook notes or paragraph here to extract concept without an image…"
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={(!imageFile && !sourceText.trim()) || extracting}
              className="w-full"
            >
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract Concept"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Image <strong>অথবা</strong> source text দিয়ে extract করুন। AI শুধু <strong>Concept</strong> ও key points
              বের করবে।
            </p>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Classification</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Settings থেকে taxonomy ও boards লোড হয়। Concept ছাড়া বাকি সব ম্যানুয়ালি সিলেক্ট করুন।
              </p>
            </div>

            <TaxonomySelects value={taxonomy} onChange={setTaxonomy} required />

            <div className="space-y-2">
              <Label>Boards</Label>
              <p className="text-xs text-muted-foreground">Admin → Settings থেকে board যোগ করুন।</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border p-3 min-h-[2.5rem]">
                {boardOptions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No boards yet.</span>
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

            <div className="space-y-2">
              <Label htmlFor="concept-name">Concept *</Label>
              <Input
                id="concept-name"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
                placeholder="AI extract করলে এখানে auto-fill হবে"
                className={conceptName ? "border-primary/40" : ""}
              />
              <p className="text-xs text-muted-foreground">
                শুধু এই ফিল্ড AI দিয়ে auto generate হয়। প্রয়োজনে হাতে এডিট করতে পারবেন।
              </p>
            </div>

            {taxonomySummary ? (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="text-foreground">{taxonomySummary}</span>
              </p>
            ) : null}
          </Card>

          {points.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Upload className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>
                Taxonomy সিলেক্ট করুন, তারপর image upload <strong>অথবা</strong> source text দিয়ে{" "}
                <span className="font-medium text-foreground">Extract Concept</span> চাপুন।
              </p>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
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
            </>
          )}
        </section>
      </main>

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
