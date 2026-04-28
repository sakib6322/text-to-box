import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Save, Sparkles } from "lucide-react";

type KeyPoint = { content: string };
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
  const [conceptName, setConceptName] = useState("");
  const [subject, setSubject] = useState("");
  const [system, setSystem] = useState("");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState<KeyPoint[]>([]);

  const onPick = (f: File) => {
    setImageFile(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleExtract = async () => {
    if (!imageFile) return toast.error("Pick a book page image first");
    setExtracting(true);
    try {
      const compressed = await compressImage(imageFile);
      const formData = new FormData();
      formData.append("image", compressed);

      const resp = await fetch("/api/extract-concept", { method: "POST", body: formData });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      setConceptName(data.concept_name ?? "");
      const extractedPoints = Array.isArray(data.high_yield_points)
        ? data.high_yield_points.map((content: string) => ({ content }))
        : [];
      setPoints(extractedPoints);
      toast.success(`Extracted ${extractedPoints.length} high-yield points`);
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

  const handleSave = async () => {
    if (!points.length) return toast.error("No key points to save");
    if (points.some((p) => !p.content.trim())) return toast.error("Empty boxes — fill or remove");
    if (!conceptName.trim() || !subject.trim() || !system.trim() || !topic.trim()) {
      return toast.error("Fill Concept, Subject, System and Topic");
    }
    setSaving(true);
    try {
      const resp = await fetch("/api/save-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept_name: conceptName,
          subject,
          system,
          topic,
          high_yield_points: points.map((p) => p.content),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Save failed");

      toast.success(`Saved ${data?.count ?? points.length} points to database`);
      setImageFile(null); setImagePreview(null); setConceptName(""); setSubject(""); setSystem(""); setTopic(""); setPoints([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error: unknown) {
      toast.error(toErrorMessage(error) ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };



  
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Medical Question Bank 1 — Concept Builder</h1>
            <p className="text-muted-foreground mt-1">
              Upload a book page → AI extracts exam-oriented key points  → verify → save with vector embeddings.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href="/suggestions">Suggestions →</a>
          </Button>
        </div>
        
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-[380px_1fr] gap-8">
        {/* Left column: upload */}
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
            <Button onClick={handleExtract} disabled={!imageFile || extracting} className="w-full">
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract Concept"}
            </Button>
          </Card>
        </section>

        {/* Right column: extracted boxes */}
        <section className="space-y-4">
          {points.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Upload className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>Upload a page and click <span className="font-medium text-foreground">Extract Concept</span> to begin.</p>
            </Card>
          ) : (
            <>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{points.length} points</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Concept *</label>
                  <Input value={conceptName} onChange={(e) => setConceptName(e.target.value)} className="mt-1" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Subject *</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">System *</label>
                    <Input value={system} onChange={(e) => setSystem(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Topic *</label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                {points.map((p, i) => (
                  <Card key={i} className="p-3 space-y-2 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="tabular-nums">#{i + 1}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removePoint(i)} aria-label="Delete">
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
    </div>
  );
};

export default Index;
