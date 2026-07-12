import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

type PromptSlug = "extract-questions" | "extract-concept" | "extract-key-points";

type PromptResponse = {
  prompt?: string;
  source?: "database" | "default";
  updated_at?: string | null;
  error?: string;
};

const PROMPT_NAV: { slug: PromptSlug; label: string; description: string }[] = [
  {
    slug: "extract-questions",
    label: "Questions",
    description: "Gemini prompt for extracting MCQ/SBA exam questions (Create Question AI).",
  },
  {
    slug: "extract-concept",
    label: "Concepts",
    description: "Prompt for concept name, verbatim text, summary, paragraphs, and detail table extraction.",
  },
  {
    slug: "extract-key-points",
    label: "Key points",
    description: "Prompt for high-yield key points / study stems used in suggestion matching.",
  },
];

function PromptEditor({ slug, description }: { slug: PromptSlug; description: string }) {
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<"database" | "default">("default");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/api/settings/prompts/${slug}`));
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
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const value = prompt.trim();
    if (!value) return toast.error("Prompt cannot be empty");
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/settings/prompts/${slug}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const j = (await r.json().catch(() => ({}))) as PromptResponse;
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setSource(j.source === "database" ? "database" : "default");
      setUpdatedAt(j.updated_at ?? null);
      toast.success("Prompt saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setResetting(true);
    try {
      const r = await fetch(apiUrl(`/api/settings/prompts/${slug}/reset`), { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as PromptResponse;
      if (!r.ok) throw new Error(j.error ?? "Reset failed");
      setPrompt(typeof j.prompt === "string" ? j.prompt : "");
      setSource("default");
      setUpdatedAt(null);
      toast.success("Reset to default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">{description}</p>
        <Badge variant={source === "database" ? "default" : "secondary"}>
          {source === "database" ? "Saved in database" : "Built-in default"}
        </Badge>
      </div>
      {updatedAt ? (
        <p className="text-xs text-muted-foreground">Last updated: {new Date(updatedAt).toLocaleString()}</p>
      ) : null}
      <div className="space-y-2">
        <Label>Prompt text</Label>
        <Textarea
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

export function AIPromptsPanel() {
  const [active, setActive] = useState<PromptSlug>("extract-questions");
  const current = PROMPT_NAV.find((p) => p.slug === active) ?? PROMPT_NAV[0];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <nav className="md:w-44 shrink-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">AI Prompts</p>
        {PROMPT_NAV.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setActive(item.slug)}
            className={[
              "w-full text-left rounded-md px-3 py-2 text-sm transition",
              active === item.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
        <h3 className="text-sm font-semibold mb-1">{current.label} prompt</h3>
        <PromptEditor key={current.slug} slug={current.slug} description={current.description} />
      </div>
    </div>
  );
}
