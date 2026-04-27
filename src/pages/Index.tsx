import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Save, Sparkles } from "lucide-react";

type KeyPoint = { content: string; language: "en" | "bn" | "mixed" };

const langLabel: Record<string, string> = { en: "English", bn: "Bangla", mixed: "Mixed" };

const Index = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"en" | "bn" | "mixed">("en");
  const [summary, setSummary] = useState("");
  const [points, setPoints] = useState<KeyPoint[]>([]);

  const onPick = (f: File) => {
    setImageFile(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleExtract = async () => {
    if (!imageFile) return toast.error("Pick a book page image first");
    setExtracting(true);
    try {
      const base64 = await fileToBase64(imageFile);
      const { data, error } = await supabase.functions.invoke("extract-points", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTitle(data.title ?? "");
      setLanguage(data.detected_language ?? "en");
      setSummary(data.summary ?? "");
      setPoints(data.key_points ?? []);
      toast.success(`Extracted ${data.key_points?.length ?? 0} key points (${langLabel[data.detected_language] ?? "?"})`);
    } catch (e: any) {
      toast.error(e.message ?? "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const updatePoint = (i: number, content: string) =>
    setPoints((p) => p.map((x, idx) => (idx === i ? { ...x, content } : x)));
  const removePoint = (i: number) => setPoints((p) => p.filter((_, idx) => idx !== i));
  const addPoint = () => setPoints((p) => [...p, { content: "", language }]);

  const handleSave = async () => {
    if (!points.length) return toast.error("No key points to save");
    if (points.some((p) => !p.content.trim())) return toast.error("Empty boxes — fill or remove");
    setSaving(true);
    try {
      let source_image_path: string | null = null;
      if (imageFile) {
        const path = `pages/${Date.now()}-${imageFile.name}`;
        const { error: upErr } = await supabase.storage.from("book-images").upload(path, imageFile);
        if (upErr) throw upErr;
        source_image_path = path;
      }
      const { data, error } = await supabase.functions.invoke("save-concept", {
        body: {
          title,
          detected_language: language,
          raw_extraction: { summary, key_points: points },
          source_image_path,
          key_points: points,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Saved ${data.count} key points with embeddings`);
      setImageFile(null); setImagePreview(null); setTitle(""); setSummary(""); setPoints([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Medical — Concept Builder</h1>
            <p className="text-muted-foreground mt-1">
              Upload a book page → AI extracts exam-oriented key points (English / Bangla / mixed) → verify → save with vector embeddings.
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
              {extracting ? "Extracting…" : "Extract key points"}
            </Button>
          </Card>

          <Card className="p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Multilingual</p>
            <p>Auto-detects English, Bangla, or mixed text. Source language is preserved — Bangla narrative keeps English medical terms intact.</p>
          </Card>
        </section>

        {/* Right column: extracted boxes */}
        <section className="space-y-4">
          {points.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Upload className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>Upload a page and click <span className="font-medium text-foreground">Extract key points</span> to begin.</p>
            </Card>
          ) : (
            <>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Detected: {langLabel[language]}</Badge>
                  <Badge>{points.length} points</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Concept title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Summary</label>
                  <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="mt-1" />
                </div>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                {points.map((p, i) => (
                  <Card key={i} className="p-3 space-y-2 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="tabular-nums">#{i + 1} · {langLabel[p.language] ?? "?"}</Badge>
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
                  {saving ? "Saving…" : "Save all"}
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
