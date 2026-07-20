import { useEffect, useState } from "react";
import { ClipboardPaste, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminCreateSelfQa, adminDeleteSelfQa, fetchSelfQa, type SelfQaItem } from "@/lib/progressApi";

type Props = { conceptId: string; conceptName?: string };

function parseBulkLines(raw: string): { question: string; answer: string }[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pairs: { question: string; answer: string }[] = [];

  for (const line of lines) {
    if (line.includes("|")) {
      const [q, ...rest] = line.split("|");
      const a = rest.join("|").trim();
      if (q.trim() && a) pairs.push({ question: q.trim(), answer: a });
      continue;
    }
    if (line.includes("\t")) {
      const [q, a] = line.split("\t");
      if (q?.trim() && a?.trim()) pairs.push({ question: q.trim(), answer: a.trim() });
      continue;
    }
  }

  if (pairs.length) return pairs;

  for (let i = 0; i < lines.length - 1; i += 2) {
    pairs.push({ question: lines[i], answer: lines[i + 1] });
  }
  return pairs;
}

export function ConceptSelfQaEditor({ conceptId, conceptName }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SelfQaItem[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [bulk, setBulk] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await fetchSelfQa(conceptId));
    } catch (e) {
      setItems([]);
      toast.error(e instanceof Error ? e.message : "Failed to load self-QA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [conceptId]);

  const add = async () => {
    if (!question.trim() || !answer.trim()) return toast.error("Question and answer required");
    setSaving(true);
    try {
      await adminCreateSelfQa(conceptId, question.trim(), answer.trim(), items.length);
      setQuestion("");
      setAnswer("");
      await reload();
      toast.success("Self-QA card added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const addBulk = async () => {
    const pairs = parseBulkLines(bulk);
    if (!pairs.length) {
      return toast.error("Use question|answer per line, or alternate question / answer lines");
    }
    setSaving(true);
    try {
      let order = items.length;
      for (const p of pairs) {
        await adminCreateSelfQa(conceptId, p.question, p.answer, order++);
      }
      setBulk("");
      await reload();
      toast.success(`Added ${pairs.length} cards`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminDeleteSelfQa(id);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Card className="space-y-4 p-4 border-violet-200/60 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/10">
      <div>
        <p className="text-xs font-semibold uppercase text-violet-700 dark:text-violet-300">
          Question Yourself — Step 3 (নিজেকে পরীক্ষা)
        </p>
        <p className="text-xs text-muted-foreground">
          One-line Q&amp;A slides per concept. Students see question → answer → next question. Completing all cards = 75% progress.
          If no cards are added here, Step 3 auto-uses True/False statements from Question Bank for this concept.
          {conceptName ? ` · ${conceptName}` : ""}
        </p>
      </div>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">No cards yet — add below.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <li key={it.id} className="rounded-md border bg-background p-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-violet-700 dark:text-violet-300">#{i + 1}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => void remove(it.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="mt-1 font-medium">{it.question}</p>
                  <p className="mt-1 text-muted-foreground">{it.answer}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 rounded-lg border bg-background p-3">
            <Label className="text-xs">Add single card</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="One-line question" disabled={saving} />
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="One-line answer" disabled={saving} />
            <Button type="button" size="sm" className="gap-1" disabled={saving} onClick={() => void add()}>
              <Plus className="h-3.5 w-3.5" /> Add card
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border bg-background p-3">
            <Label className="text-xs">Bulk paste</Label>
            <Textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={5}
              disabled={saving}
              placeholder={"What is X?|Short answer\nOr alternate lines:\nQuestion line 1\nAnswer line 1\nQuestion line 2\nAnswer line 2"}
            />
            <Button type="button" size="sm" variant="secondary" className="gap-1" disabled={saving} onClick={() => void addBulk()}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Import bulk
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
