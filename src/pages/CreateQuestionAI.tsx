import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

const mkId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function CreateQuestionAI() {
  const [academicClass, setAcademicClass] = useState("");
  const [subject, setSubject] = useState("");
  const [system, setSystem] = useState("");
  const [topic, setTopic] = useState("");

  const [enableBijoyPaste, setEnableBijoyPaste] = useState(false);
  const [enableHelper, setEnableHelper] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [points, setPoints] = useState<ApprovedPoint[]>([]);

  const breadcrumb = useMemo(() => {
    const s = (v: string, fallback: string) => (v.trim() ? v.trim() : fallback);
    return [
      s(subject, "Subject"),
      s(system, "System"),
      s(topic, "Topic"),
      s(result?.concept_name ?? "", "Concept"),
    ];
  }, [subject, system, topic, result?.concept_name]);

  const handleExtract = async () => {
    if (!imageFile) return toast.error("Please choose a book image first");
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const resp = await fetch("/api/extract-concept", { method: "POST", body: formData });
      const data = (await resp.json().catch(() => ({}))) as any;
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Extraction failed");

      const extracted: ExtractResult = {
        concept_name: typeof data?.concept_name === "string" ? data.concept_name : "",
        high_yield_points: Array.isArray(data?.high_yield_points) ? data.high_yield_points.filter((x: any) => typeof x === "string") : [],
      };

      setResult(extracted);
      setPoints(extracted.high_yield_points.map((text) => ({ point_id: mkId(), text, approved: false })));
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
          academic_class: academicClass,
          subject,
          system,
          topic,
          concept: result?.concept_name ?? "",
          question_text: p.text,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(typeof data?.error === "string" ? data.error : "Approval failed");

      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, approved: true, saving: false } : x)));
      toast.success("Approved & saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
      setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, saving: false } : x)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Create Question</h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={`${b}-${i}`} className="inline-flex items-center gap-1">
                <span className="truncate max-w-[14rem]">{b}</span>
                {i < breadcrumb.length - 1 ? <ChevronRight className="h-4 w-4 opacity-60" /> : null}
              </span>
            ))}
          </div>
        </div>
        <Badge variant="secondary">AI Auto-fill</Badge>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Academic Class *</Label>
            <Input value={academicClass} onChange={(e) => setAcademicClass(e.target.value)} placeholder="Nine-Ten" />
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="উচ্চতর গণিত" />
          </div>
          <div className="space-y-2">
            <Label>System *</Label>
            <Input value={system} onChange={(e) => setSystem(e.target.value)} placeholder="অধ্যায়-১৪ : সম্ভাবনা" />
          </div>
          <div className="space-y-2">
            <Label>Topic *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="টপিক-৪ : ..." />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={enableBijoyPaste} onCheckedChange={(v) => setEnableBijoyPaste(Boolean(v))} />
              Enable Bijoy Paste
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={enableHelper} onCheckedChange={(v) => setEnableHelper(Boolean(v))} />
              Enable Helper
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            <Button onClick={handleExtract} disabled={!imageFile || extracting}>
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting…" : "Extract Concept"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium">Select Question Type *</div>
          <div className="mt-3 space-y-2">
            <button className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition">
              <div className="font-medium">MCQ (Multiple Choice)</div>
              <div className="text-xs text-muted-foreground">MCQ</div>
            </button>
            <button className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition">
              <div className="font-medium">Short Answer (1 Mark)</div>
              <div className="text-xs text-muted-foreground">SAQ1</div>
            </button>
            <button className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition">
              <div className="font-medium">Short Answer (2 Marks)</div>
              <div className="text-xs text-muted-foreground">SAQ2</div>
            </button>
          </div>
        </Card>

        <Card className="p-4">
          {!result ? (
            <div className="h-[340px] grid place-items-center text-muted-foreground">
              NO QUESTION TYPE SELECTED
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-1">
                  <div className="text-sm font-medium">AI Extracted Result</div>
                  <div className="text-xs text-muted-foreground">
                    Approve points to increment line_count and save to Questions table.
                  </div>
                </div>
                <Badge variant="outline">{points.filter((p) => p.approved).length}/{points.length} approved</Badge>
              </div>

              <div className="space-y-2">
                {points.map((p, idx) => (
                  <Card key={p.point_id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Textarea
                          value={p.text}
                          onChange={(e) =>
                            setPoints((ps) => ps.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                          }
                          rows={2}
                          className="resize-none"
                        />
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>point_id:</span>
                          <code className="rounded bg-muted px-1 py-0.5">{p.point_id.slice(0, 8)}…</code>
                          {p.approved ? <Badge variant="secondary">Approved</Badge> : null}
                        </div>
                      </div>
                      <Button
                        onClick={() => approvePoint(idx)}
                        disabled={p.approved || p.saving}
                        className="shrink-0"
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
    </div>
  );
}

