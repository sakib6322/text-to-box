import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Home,
  Loader2,
  Pin,
  Plus,
  Save,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, readJsonResponse } from "@/lib/apiBase";
import { hasPermission } from "@/lib/auth";
import { guardPermission } from "@/lib/permissionGuard";
import {
  SITE_UPDATE_PAGES,
  findSiteUpdatePage,
  formatSessionExport,
  newSiteUpdateItem,
  type SiteUpdateItem,
  type SiteUpdatePriority,
  type SiteUpdateSession,
  type SiteUpdateStatus,
} from "@/lib/siteUpdateBriefs";
import { cn } from "@/lib/utils";

const PRIORITIES: SiteUpdatePriority[] = ["low", "normal", "high", "urgent"];
const STATUSES: SiteUpdateStatus[] = ["open", "saved", "done", "archived"];

function priorityTone(p: SiteUpdatePriority) {
  if (p === "urgent") return "destructive";
  if (p === "high") return "default";
  if (p === "low") return "outline";
  return "secondary";
}

export default function AdminSiteUpdates() {
  const canEdit = hasPermission("settings.site_updates.edit");
  const canShare = hasPermission("settings.site_updates.share");

  const [sessions, setSessions] = useState<SiteUpdateSession[]>([]);
  const [active, setActive] = useState<SiteUpdateSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/settings/site-updates");
      const j = await readJsonResponse<{ sessions?: SiteUpdateSession[]; error?: string }>(r, {});
      if (!r.ok) throw new Error(j.error || "Failed to load sessions");
      setSessions(j.sessions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openSession = async () => {
    if (!guardPermission("settings.site_updates.edit")) return;
    setOpening(true);
    try {
      const r = await apiFetch("/api/settings/site-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draftTitle.trim() || undefined, items: [] }),
      });
      const j = await readJsonResponse<{ session?: SiteUpdateSession; error?: string }>(r, {});
      if (!r.ok || !j.session) throw new Error(j.error || "Could not open session");
      setActive(j.session);
      setDraftTitle("");
      setAdvancedOpen(false);
      await loadList();
      toast.success("Session opened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Open failed");
    } finally {
      setOpening(false);
    }
  };

  const resumeSession = (s: SiteUpdateSession) => {
    setActive({ ...s, items: s.items?.length ? s.items : [] });
    setAdvancedOpen(false);
  };

  const updateActive = (patch: Partial<SiteUpdateSession>) => {
    setActive((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateItem = (id: string, patch: Partial<SiteUpdateItem>) => {
    setActive((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      };
    });
  };

  const addItem = () => {
    setActive((prev) => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, newSiteUpdateItem()] };
    });
  };

  const removeItem = (id: string) => {
    setActive((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((it) => it.id !== id) };
    });
  };

  const saveSession = async (status?: SiteUpdateStatus) => {
    if (!active) return;
    if (!guardPermission("settings.site_updates.edit")) return;
    if (!active.items.length) return toast.error("কমপক্ষে একটি update instruction যোগ করুন");
    const empty = active.items.some((it) => !it.description.trim());
    if (empty) return toast.error("প্রতিটি instruction-এ description লাগবে");

    setSaving(true);
    try {
      const payload = {
        ...active,
        status: status ?? (active.status === "open" ? "saved" : active.status),
      };
      const r = await apiFetch(`/api/settings/site-updates/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await readJsonResponse<{ session?: SiteUpdateSession; error?: string }>(r, {});
      if (!r.ok || !j.session) throw new Error(j.error || "Save failed");
      setActive(j.session);
      await loadList();
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!guardPermission("settings.site_updates.edit")) return;
    if (!window.confirm("এই session মুছে ফেলবেন?")) return;
    try {
      const r = await apiFetch(`/api/settings/site-updates/${id}`, { method: "DELETE" });
      const j = await readJsonResponse<{ error?: string }>(r, {});
      if (!r.ok) throw new Error(j.error || "Delete failed");
      if (active?.id === id) setActive(null);
      await loadList();
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggleShare = async (enable: boolean) => {
    if (!active) return;
    if (!guardPermission("settings.site_updates.share")) return;
    try {
      const r = await apiFetch(`/api/settings/site-updates/${active.id}/${enable ? "share" : "unshare"}`, {
        method: "POST",
      });
      const j = await readJsonResponse<{ session?: SiteUpdateSession; error?: string }>(r, {});
      if (!r.ok || !j.session) throw new Error(j.error || "Share update failed");
      setActive(j.session);
      await loadList();
      if (enable) {
        const url = `${window.location.origin}/site-updates/${j.session.shareToken}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Share link copied");
      } else {
        toast.success("Sharing disabled");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    }
  };

  const copyShareLink = async () => {
    if (!active?.shareToken) return toast.error("আগে Share চালু করুন");
    const url = `${window.location.origin}/site-updates/${active.shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const copyExport = async () => {
    if (!active) return;
    if (!active.advanced.allowCopyExport) return toast.error("Export বন্ধ করা আছে (Advanced)");
    await navigator.clipboard.writeText(formatSessionExport(active));
    toast.success("Instructions copied");
  };

  const tagText = useMemo(() => (active?.advanced.tags ?? []).join(", "), [active?.advanced.tags]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
          <Home className="h-4 w-4" />
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/admin/settings" className="hover:text-foreground">
          Settings
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Site updates</span>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <h1 className="page-title">Site update briefs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Session খুলে কোন পেজ/অপশন আপডেট করতে হবে তার instruction লিখুন — একাধিক item যোগ করে Save ও Share করুন।
          </p>
        </div>

        {!active ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>New session title (optional)</Label>
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g. Practice UI contrast + Appearance colors"
                  disabled={!canEdit}
                />
              </div>
              <Button type="button" onClick={() => void openSession()} disabled={!canEdit || opening}>
                {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Open session
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Saved sessions</p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">এখনো কোনো session নেই — উপরে Open session চাপুন।</p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5"
                    >
                      {s.advanced?.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : null}
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
                        onClick={() => resumeSession(s)}
                      >
                        {s.title}
                      </button>
                      <Badge variant="outline" className="text-[10px]">
                        {s.status}
                      </Badge>
                      <Badge variant={priorityTone(s.advanced?.priority ?? "normal")} className="text-[10px]">
                        {s.advanced?.priority ?? "normal"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {s.items?.length ?? 0} items
                      </Badge>
                      {s.shareEnabled ? (
                        <Badge className="text-[10px]">
                          <Share2 className="mr-1 h-3 w-3" /> shared
                        </Badge>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => resumeSession(s)}>
                        Open
                      </Button>
                      {canEdit ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void deleteSession(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label>Session title</Label>
                <Input
                  value={active.title}
                  onChange={(e) => updateActive({ title: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-6">
                <Button type="button" variant="outline" size="sm" onClick={() => setActive(null)}>
                  <X className="mr-1 h-4 w-4" /> Close
                </Button>
                <Button type="button" size="sm" onClick={() => void saveSession()} disabled={!canEdit || saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {active.status}</Badge>
              <Badge variant={priorityTone(active.advanced.priority)}>{active.advanced.priority}</Badge>
              <Badge variant="secondary">{active.items.length} instructions</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Update instructions</p>
                {canEdit ? (
                  <Button type="button" size="sm" variant="outline" onClick={addItem}>
                    <Plus className="mr-1 h-4 w-4" /> Add instruction
                  </Button>
                ) : null}
              </div>

              {active.items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  এখনো instruction নেই — Add instruction দিয়ে পেজ সিলেক্ট করে description লিখুন।
                </p>
              ) : (
                active.items.map((item, index) => (
                  <InstructionCard
                    key={item.id}
                    index={index}
                    item={item}
                    disabled={!canEdit}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))
              )}
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="px-0">
                  <ChevronDown className={cn("mr-1 h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                  Advanced options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4 rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Session status</Label>
                    <Select
                      value={active.status}
                      onValueChange={(v) => updateActive({ status: v as SiteUpdateStatus })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={active.advanced.priority}
                      onValueChange={(v) =>
                        updateActive({ advanced: { ...active.advanced, priority: v as SiteUpdatePriority } })
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assignee</Label>
                    <Input
                      value={active.advanced.assignee}
                      onChange={(e) =>
                        updateActive({ advanced: { ...active.advanced, assignee: e.target.value } })
                      }
                      disabled={!canEdit}
                      placeholder="Who should apply this"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={active.advanced.dueAt?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        updateActive({
                          advanced: { ...active.advanced, dueAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : null },
                        })
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Tags (comma separated)</Label>
                    <Input
                      value={tagText}
                      onChange={(e) =>
                        updateActive({
                          advanced: {
                            ...active.advanced,
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      disabled={!canEdit}
                      placeholder="practice, appearance, mobile"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={active.advanced.pinned}
                      onCheckedChange={(v) => updateActive({ advanced: { ...active.advanced, pinned: v } })}
                      disabled={!canEdit}
                    />
                    Pin session
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={active.advanced.includePathsInShare}
                      onCheckedChange={(v) =>
                        updateActive({ advanced: { ...active.advanced, includePathsInShare: v } })
                      }
                      disabled={!canEdit}
                    />
                    Include page paths in share/export
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={active.advanced.allowCopyExport}
                      onCheckedChange={(v) =>
                        updateActive({ advanced: { ...active.advanced, allowCopyExport: v } })
                      }
                      disabled={!canEdit}
                    />
                    Allow copy export
                  </label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {canShare ? (
                <>
                  <Button
                    type="button"
                    variant={active.shareEnabled ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => void toggleShare(!active.shareEnabled)}
                  >
                    <Share2 className="mr-1 h-4 w-4" />
                    {active.shareEnabled ? "Disable share" : "Enable share"}
                  </Button>
                  {active.shareEnabled ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyShareLink()}>
                      <Copy className="mr-1 h-4 w-4" /> Copy share link
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => void copyExport()}>
                <Copy className="mr-1 h-4 w-4" /> Copy as text
              </Button>
              <Button type="button" size="sm" onClick={() => void saveSession("saved")} disabled={!canEdit || saving}>
                <Save className="mr-1 h-4 w-4" /> Save session
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function InstructionCard({
  index,
  item,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  item: SiteUpdateItem;
  disabled?: boolean;
  onChange: (patch: Partial<SiteUpdateItem>) => void;
  onRemove: () => void;
}) {
  const page = findSiteUpdatePage(item.pageId);
  const options = page?.options ?? [];
  const [itemAdvanced, setItemAdvanced] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Instruction #{index + 1}</p>
        {!disabled ? (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Page</Label>
          <Select
            value={item.pageId}
            onValueChange={(v) => onChange({ pageId: v, optionId: null })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select page" />
            </SelectTrigger>
            <SelectContent>
              {SITE_UPDATE_PAGES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {page?.path ? <p className="text-[11px] text-muted-foreground">{page.path}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label>Option (optional)</Label>
          <Select
            value={item.optionId ?? "__none__"}
            onValueChange={(v) => onChange({ optionId: v === "__none__" ? null : v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any / whole page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Whole page / any</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description — কিভাবে কি আপডেট করতে হবে</Label>
        <Textarea
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={disabled}
          rows={4}
          placeholder="ধাপে ধাপে লিখুন: কোথায় যাবেন, কোন কালার/অপশন বদলাবেন, expected result কী…"
        />
      </div>

      <Collapsible open={itemAdvanced} onOpenChange={setItemAdvanced}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-0 text-xs">
            Item advanced
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={item.advanced.priority}
              onValueChange={(v) =>
                onChange({ advanced: { ...item.advanced, priority: v as SiteUpdatePriority } })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Switch
              checked={item.advanced.done}
              onCheckedChange={(v) => onChange({ advanced: { ...item.advanced, done: v } })}
              disabled={disabled}
            />
            Mark done
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Private note</Label>
            <Input
              value={item.advanced.note}
              onChange={(e) => onChange({ advanced: { ...item.advanced, note: e.target.value } })}
              disabled={disabled}
              placeholder="Internal note"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
