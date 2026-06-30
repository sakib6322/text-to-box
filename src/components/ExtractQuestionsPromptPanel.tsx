import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

type PromptResponse = {
  prompt?: string;
  source?: "database" | "default";
  updated_at?: string | null;
  error?: string;
};

export function ExtractQuestionsPromptPanel() {
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<"database" | "default">("default");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/settings/prompts/extract-questions"));
      const j = (await r.json().catch(() => ({}))) as PromptResponse;
      if (!r.ok) throw new Error(j.error ?? "Failed to load prompt");
      setPrompt(typeof j.prompt === "string" ? j.prompt : "");
      setSource(j.source === "database" ? "database" : "default");
      setUpdatedAt(j.updated_at ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load prompt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const value = prompt.trim();
    if (!value) return toast.error("Prompt cannot be empty");
    setSaving(true);
    try {
      const r = await fetch(apiUrl("/api/settings/prompts/extract-questions"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const j = (await r.json().catch(() => ({}))) as PromptResponse;
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setSource(j.source === "database" ? "database" : "default");
      setUpdatedAt(j.updated_at ?? null);
      toast.success("Prompt saved to database");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setResetting(true);
    try {
      const r = await fetch(apiUrl("/api/settings/prompts/extract-questions/reset"), { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as PromptResponse;
      if (!r.ok) throw new Error(j.error ?? "Reset failed");
      setPrompt(typeof j.prompt === "string" ? j.prompt : "");
      setSource("default");
      setUpdatedAt(null);
      toast.success("Reset to default prompt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading prompt…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
          This prompt is sent to Gemini when extracting exam questions from images or text (Create Question AI).
          Changes are stored in the database and used by the API immediately.
        </p>
        <Badge variant={source === "database" ? "default" : "secondary"}>
          {source === "database" ? "Saved in database" : "Using built-in default"}
        </Badge>
      </div>
      {updatedAt ? (
        <p className="text-xs text-muted-foreground">Last updated: {new Date(updatedAt).toLocaleString()}</p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="extract-questions-prompt">Extract questions prompt</Label>
        <Textarea
          id="extract-questions-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={18}
          className="resize-y font-mono text-xs leading-relaxed"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving || resetting || !prompt.trim()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save prompt
        </Button>
        <Button type="button" variant="outline" onClick={resetToDefault} disabled={saving || resetting}>
          {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Reset to default
        </Button>
      </div>
    </div>
  );
}
