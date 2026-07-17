import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { apiFetch, apiUrl } from "@/lib/apiBase";

type PromptSlug = "extract-questions" | "extract-concept" | "extract-key-points" | "matching";

type PromptResponse = {
  prompt?: string;
  source?: "database" | "default";
  updated_at?: string | null;
  error?: string;
};

type MatchingResponse = PromptResponse & {
  vector_enabled?: boolean;
  ai_enabled?: boolean;
  vector_source?: "database" | "default";
  ai_source?: "database" | "default";
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
  {
    slug: "matching",
    label: "Matching",
    description: "Prompt and toggles for suggestion matching (vector search + AI scoring).",
  },
];

function PromptEditor({ slug, description }: { slug: Exclude<PromptSlug, "matching">; description: string }) {
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
      const r = await apiFetch(`/api/settings/prompts/${slug}`, {
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
      const r = await apiFetch(`/api/settings/prompts/${slug}/reset`, { method: "POST" });
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

function MatchingPromptEditor({ description }: { description: string }) {
  const [prompt, setPrompt] = useState("");
  const [vectorEnabled, setVectorEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [source, setSource] = useState<"database" | "default">("default");
  const [vectorSource, setVectorSource] = useState<"database" | "default">("default");
  const [aiSource, setAiSource] = useState<"database" | "default">("default");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/settings/prompts/matching"));
      const j = (await r.json().catch(() => ({}))) as MatchingResponse;
      if (!r.ok) throw new Error(j.error ?? "Failed to load matching settings");
      setPrompt(typeof j.prompt === "string" ? j.prompt : "");
      setVectorEnabled(j.vector_enabled !== false);
      setAiEnabled(j.ai_enabled === true);
      setSource(j.source === "database" ? "database" : "default");
      setVectorSource(j.vector_source === "database" ? "database" : "default");
      setAiSource(j.ai_source === "database" ? "database" : "default");
      setUpdatedAt(j.updated_at ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load matching settings");
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
    if (!vectorEnabled && !aiEnabled) {
      return toast.error("Enable at least one matching method (vector or AI)");
    }
    setSaving(true);
    try {
      const r = await apiFetch("/api/settings/prompts/matching", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          vector_enabled: vectorEnabled,
          ai_enabled: aiEnabled,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as MatchingResponse;
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setSource(j.source === "database" ? "database" : "default");
      setVectorSource(j.vector_source === "database" ? "database" : "default");
      setAiSource(j.ai_source === "database" ? "database" : "default");
      setUpdatedAt(j.updated_at ?? null);
      toast.success("Matching settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setResetting(true);
    try {
      const r = await apiFetch("/api/settings/prompts/matching/reset", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as MatchingResponse;
      if (!r.ok) throw new Error(j.error ?? "Reset failed");
      setPrompt(typeof j.prompt === "string" ? j.prompt : "");
      setVectorEnabled(j.vector_enabled !== false);
      setAiEnabled(j.ai_enabled === true);
      setSource("default");
      setVectorSource("default");
      setAiSource("default");
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
          {source === "database" ? "Prompt saved in database" : "Default prompt"}
        </Badge>
      </div>
      {updatedAt ? (
        <p className="text-xs text-muted-foreground">Prompt last updated: {new Date(updatedAt).toLocaleString()}</p>
      ) : null}

      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Matching methods</p>
        <p className="text-xs text-muted-foreground">
          Vector match finds candidates via embedding similarity. AI match re-scores top candidates with Gemini using the prompt below.
          At least one method must stay enabled.
        </p>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <Checkbox
            checked={vectorEnabled}
            onCheckedChange={(v) => setVectorEnabled(Boolean(v))}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Vector match</span>
            <span className="block text-xs text-muted-foreground">
              pgvector similarity search on key point embeddings
              {vectorSource === "database" ? " · saved in database" : " · default (on)"}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <Checkbox
            checked={aiEnabled}
            onCheckedChange={(v) => setAiEnabled(Boolean(v))}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">AI match</span>
            <span className="block text-xs text-muted-foreground">
              Gemini scores top vector candidates; requires Gemini API keys
              {aiSource === "database" ? " · saved in database" : " · default (off)"}
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <Label>AI matching prompt</Label>
        <p className="text-xs text-muted-foreground">
          Stored in the database and loaded on every match when AI match is enabled. Source text and candidate key
          points are appended automatically.
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={14}
          className="resize-y font-mono text-xs leading-relaxed"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={save}
          disabled={saving || resetting || !prompt.trim() || (!vectorEnabled && !aiEnabled)}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save matching settings
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
        {current.slug === "matching" ? (
          <MatchingPromptEditor key="matching" description={current.description} />
        ) : (
          <PromptEditor key={current.slug} slug={current.slug} description={current.description} />
        )}
      </div>
    </div>
  );
}
