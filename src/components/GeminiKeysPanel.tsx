import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import {
  DEFAULT_FALLBACK_AI_MODEL,
  DEFAULT_MATCH_AI_MODEL,
  DEFAULT_PRIMARY_AI_MODEL,
  GEMINI_MODEL_OPTIONS,
  type GeminiModelOption,
} from "@/lib/geminiModels";

type KeyStatus = "active" | "idle" | "quota_exceeded" | "invalid" | "disabled" | "error";

type SavedKey = {
  id: string;
  label: string;
  masked: string;
  sort_order: number;
  is_active: boolean;
  status: KeyStatus;
  last_used_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  error_count?: number;
};

type KeysResponse = {
  keys?: SavedKey[];
  count?: number;
  source?: "database" | "env_fallback" | "none";
  env_fallback_configured?: boolean;
  env_fallback_masked?: string | null;
  error?: string;
};

type ModelsResponse = {
  primary?: string;
  fallback?: string;
  match?: string;
  options?: GeminiModelOption[];
  source?: { primary?: string; fallback?: string; match?: string };
  error?: string;
};

function mergeModelOptions(apiOptions?: GeminiModelOption[], selectedIds: string[] = []): GeminiModelOption[] {
  const map = new Map<string, GeminiModelOption>();
  for (const m of GEMINI_MODEL_OPTIONS) map.set(m.id, m);
  for (const m of apiOptions ?? []) {
    if (m?.id) map.set(m.id, { id: m.id, label: m.label || m.id });
  }
  for (const id of selectedIds) {
    if (id && !map.has(id)) map.set(id, { id, label: id });
  }
  return Array.from(map.values());
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusBadge({ status, isActive }: { status: KeyStatus; isActive: boolean }) {
  if (!isActive || status === "disabled") {
    return <Badge variant="secondary">বন্ধ</Badge>;
  }
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0">
          চালু · কাজ করছে
        </Badge>
      );
    case "quota_exceeded":
      return (
        <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-600">
          লিমিট শেষ
        </Badge>
      );
    case "invalid":
      return <Badge variant="destructive">অকার্যকর key</Badge>;
    case "error":
      return <Badge variant="destructive">ত্রুটি</Badge>;
    case "idle":
    default:
      return <Badge variant="outline">পরীক্ষা হয়নি</Badge>;
  }
}

export function GeminiKeysPanel() {
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [saved, setSaved] = useState<KeysResponse | null>(null);

  const [modelOptions, setModelOptions] = useState<GeminiModelOption[]>(GEMINI_MODEL_OPTIONS);
  const [primaryModel, setPrimaryModel] = useState(DEFAULT_PRIMARY_AI_MODEL);
  const [fallbackModel, setFallbackModel] = useState(DEFAULT_FALLBACK_AI_MODEL);
  const [matchModel, setMatchModel] = useState(DEFAULT_MATCH_AI_MODEL);
  const [modelSource, setModelSource] = useState<ModelsResponse["source"]>();

  const [keyCount, setKeyCount] = useState(1);
  const [keyInputs, setKeyInputs] = useState<string[]>([""]);

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState<SavedKey | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<SavedKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, modelsRes] = await Promise.all([
        apiFetch("/api/settings/gemini-keys"),
        apiFetch("/api/settings/gemini-models"),
      ]);
      const keysJson = (await keysRes.json().catch(() => ({}))) as KeysResponse;
      const modelsJson = (await modelsRes.json().catch(() => ({}))) as ModelsResponse;
      if (!keysRes.ok) throw new Error(keysJson.error ?? `Failed (${keysRes.status})`);

      setSaved(keysJson);

      const primary = modelsJson.primary || DEFAULT_PRIMARY_AI_MODEL;
      const fallback = modelsJson.fallback || DEFAULT_FALLBACK_AI_MODEL;
      const match = modelsJson.match || DEFAULT_MATCH_AI_MODEL;
      setPrimaryModel(primary);
      setFallbackModel(fallback);
      setMatchModel(match);
      setModelOptions(mergeModelOptions(modelsJson.options, [primary, fallback, match]));
      setModelSource(modelsRes.ok ? modelsJson.source : undefined);

      if (!modelsRes.ok) {
        toast.error(modelsJson.error ?? `Models load failed (${modelsRes.status}) — defaults দেখানো হচ্ছে`);
      }
    } catch (e) {
      setModelOptions(GEMINI_MODEL_OPTIONS);
      setPrimaryModel(DEFAULT_PRIMARY_AI_MODEL);
      setFallbackModel(DEFAULT_FALLBACK_AI_MODEL);
      setMatchModel(DEFAULT_MATCH_AI_MODEL);
      toast.error(e instanceof Error ? e.message : "Failed to load Gemini settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveModels = async () => {
    setSavingModels(true);
    try {
      const r = await apiFetch("/api/settings/gemini-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary: primaryModel,
          fallback: fallbackModel,
          match: matchModel,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as ModelsResponse & { ok?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Model save failed");
      if (j.primary) setPrimaryModel(j.primary);
      if (j.fallback) setFallbackModel(j.fallback);
      if (j.match) setMatchModel(j.match);
      setModelOptions(
        mergeModelOptions(j.options, [
          j.primary || primaryModel,
          j.fallback || fallbackModel,
          j.match || matchModel,
        ]),
      );
      setModelSource(j.source);
      toast.success("Gemini models সেভ হয়েছে — এখন থেকে এই models ব্যবহার হবে");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Model সেভ ব্যর্থ");
    } finally {
      setSavingModels(false);
    }
  };

  const applyCount = () => {
    const n = Math.max(1, Math.min(20, Math.floor(Number(keyCount) || 1)));
    setKeyCount(n);
    setKeyInputs((prev) => {
      if (prev.length === n) return prev;
      if (prev.length < n) return [...prev, ...Array.from({ length: n - prev.length }, () => "")];
      return prev.slice(0, n);
    });
  };

  const addKeys = async () => {
    const keys = keyInputs.map((k) => k.trim()).filter(Boolean);
    if (keys.length !== keyInputs.length) {
      return toast.error("সব input box-এ API key দিন");
    }
    if (keys.length === 0) return toast.error("কমপক্ষে একটি API key দিন");
    setAdding(true);
    try {
      const r = await apiFetch("/api/settings/gemini-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; saved?: number };
      if (!r.ok) throw new Error(j.error ?? `Add failed (${r.status})`);
      toast.success(`${j.saved ?? keys.length} টি API key যোগ হয়েছে`);
      setKeyInputs([""]);
      setKeyCount(1);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "যোগ করা যায়নি");
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (k: SavedKey) => {
    setEditKey(k);
    setEditLabel(k.label);
    setEditApiKey("");
    setEditActive(k.is_active);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editKey) return;
    setSavingEdit(true);
    try {
      const body: { label?: string; api_key?: string; is_active?: boolean } = {
        label: editLabel.trim(),
        is_active: editActive,
      };
      if (editApiKey.trim()) body.api_key = editApiKey.trim();

      const r = await apiFetch(`/api/settings/gemini-keys/${editKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      toast.success("API key আপডেট হয়েছে");
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "আপডেট ব্যর্থ");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const r = await apiFetch(`/api/settings/gemini-keys/${deleteTarget.id}`, { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      toast.success("API key মুছে ফেলা হয়েছে");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setDeletingId(null);
    }
  };

  const testOne = async (k: SavedKey) => {
    setTestingId(k.id);
    try {
      const r = await apiFetch(`/api/settings/gemini-keys/${k.id}/test`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: KeyStatus;
        message?: string;
        masked?: string;
      };
      await load();
      if (j.ok) {
        toast.success(`${k.label}: চালু · কাজ করছে (${j.masked})`);
      } else {
        const msg =
          j.status === "quota_exceeded"
            ? "লিমিট শেষ হয়ে গেছে"
            : j.status === "invalid"
              ? "অকার্যকর API key"
              : j.message ?? "পরীক্ষা ব্যর্থ";
        toast.error(`${k.label}: ${msg}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "পরীক্ষা ব্যর্থ");
    } finally {
      setTestingId(null);
    }
  };

  const testAll = async () => {
    setTestingAll(true);
    try {
      const r = await apiFetch("/api/settings/gemini-keys/test-all", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as {
        results?: { id: string; label?: string; ok: boolean; status: KeyStatus }[];
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Test failed");
      await load();
      const results = j.results ?? [];
      const ok = results.filter((x) => x.ok).length;
      const quota = results.filter((x) => x.status === "quota_exceeded").length;
      const invalid = results.filter((x) => x.status === "invalid").length;
      toast.success(
        `পরীক্ষা সম্পন্ন: ${ok} চালু, ${quota} লিমিট শেষ, ${invalid} অকার্যকর`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সব key পরীক্ষা ব্যর্থ");
    } finally {
      setTestingAll(false);
    }
  };

  const keys = saved?.keys ?? [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Gemini API লোড হচ্ছে…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Gemini API Keys</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          একাধিক API key যোগ করুন। একটি key-এর লিমিট শেষ হলে সার্ভার পরের key ব্যবহার করবে। টেবিলে স্ট্যাটাস,
          এডিট ও ডিলিট করতে পারবেন।
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Gemini API Models</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Primary = extract / generate; Fallback = primary fail হলে; Match = key-point matching AI score।
            সেভ করলে database-এ থাকবে এবং সার্ভার সেই model ব্যবহার করবে।
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Primary model</Label>
            <Select value={primaryModel} onValueChange={setPrimaryModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelSource?.primary ? (
              <p className="text-xs text-muted-foreground">Source: {modelSource.primary}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Fallback model</Label>
            <Select value={fallbackModel} onValueChange={setFallbackModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={`fb-${m.id}`} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelSource?.fallback ? (
              <p className="text-xs text-muted-foreground">Source: {modelSource.fallback}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Match model</Label>
            <Select value={matchModel} onValueChange={setMatchModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={`match-${m.id}`} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelSource?.match ? (
              <p className="text-xs text-muted-foreground">Source: {modelSource.match}</p>
            ) : null}
          </div>
        </div>

        <Button type="button" onClick={saveModels} disabled={savingModels}>
          {savingModels ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Models সেভ করুন
        </Button>
      </Card>

      {saved?.source === "env_fallback" ? (
        <Card className="p-4 border-dashed bg-amber-500/5">
          <p className="text-sm">
            DB-তে key নেই — <code className="text-xs">.env</code> এর GEMINI_API_KEY fallback হিসেবে চলছে (
            {saved.env_fallback_masked}). নিচে key যোগ করুন।
          </p>
        </Card>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b bg-muted/30">
          <p className="text-sm font-medium">
            সংরক্ষিত API Keys {keys.length > 0 ? `(${keys.length})` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={testAll} disabled={testingAll || keys.length === 0}>
              {testingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              সব পরীক্ষা করুন
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={load} title="রিফ্রেশ">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {keys.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            এখনো কোনো API key নেই। নিচে key যোগ করুন।
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>শেষ ব্যবহার</TableHead>
                <TableHead className="w-16 text-center">ত্রুটি</TableHead>
                <TableHead className="text-right w-36">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k, idx) => (
                <TableRow key={k.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="font-mono text-xs">{k.masked}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StatusBadge status={k.status} isActive={k.is_active} />
                      {k.last_error_message && k.status !== "active" ? (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={k.last_error_message}>
                          {k.last_error_message}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatWhen(k.last_used_at ?? k.last_success_at)}
                  </TableCell>
                  <TableCell className="text-center">{k.error_count ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="পরীক্ষা"
                        disabled={testingId === k.id}
                        onClick={() => testOne(k)}
                      >
                        {testingId === k.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" title="এডিট" onClick={() => openEdit(k)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="ডিলিট"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === k.id}
                        onClick={() => setDeleteTarget(k)}
                      >
                        {deletingId === k.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <h4 className="text-sm font-semibold">নতুন API Key যোগ করুন</h4>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gemini-count">কতটি key যোগ করবেন?</Label>
            <Input
              id="gemini-count"
              type="number"
              min={1}
              max={20}
              value={keyCount}
              onChange={(e) => setKeyCount(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button type="button" variant="outline" onClick={applyCount}>
            Input box তৈরি করুন
          </Button>
        </div>

        <div className="space-y-3">
          {keyInputs.map((val, idx) => (
            <div key={idx} className="space-y-1.5">
              <Label htmlFor={`gemini-key-${idx}`}>API Key {idx + 1}</Label>
              <Input
                id={`gemini-key-${idx}`}
                type="password"
                autoComplete="off"
                placeholder="AIza…"
                value={val}
                onChange={(e) => {
                  const next = [...keyInputs];
                  next[idx] = e.target.value;
                  setKeyInputs(next);
                }}
                className="font-mono text-sm"
              />
            </div>
          ))}
        </div>

        <Button type="button" onClick={addKeys} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          API KEY যোগ করুন
        </Button>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key এডিট</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">নাম / Label</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="API Key 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-key">নতুন API Key (খালি রাখলে আগেরটাই থাকবে)</Label>
              <Input
                id="edit-key"
                type="password"
                autoComplete="off"
                value={editApiKey}
                onChange={(e) => setEditApiKey(e.target.value)}
                placeholder={editKey?.masked ?? "AIza…"}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Rotation-এ ব্যবহার</Label>
                <p className="text-xs text-muted-foreground">বন্ধ করলে এই key skip হবে</p>
              </div>
              <Switch id="edit-active" checked={editActive} onCheckedChange={setEditActive} />
            </div>
            {editKey ? (
              <p className="text-xs text-muted-foreground">
                বর্তমান: {editKey.masked} · স্ট্যাটাস: {editKey.status}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              বাতিল
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              সেভ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="API Key মুছবেন?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.label}</strong> ({deleteTarget.masked}) স্থায়ীভাবে মুছে যাবে।
            </>
          ) : null
        }
        confirmLabel="মুছুন"
        cancelLabel="বাতিল"
        confirming={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
