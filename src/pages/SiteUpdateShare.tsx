import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl, readJsonResponse } from "@/lib/apiBase";
import {
  findSiteUpdateOption,
  findSiteUpdatePage,
  formatSessionExport,
  type SiteUpdateSession,
} from "@/lib/siteUpdateBriefs";

type SharedSession = Pick<SiteUpdateSession, "id" | "title" | "status" | "updatedAt" | "items"> & {
  advanced: {
    priority: string;
    tags: string[];
    assignee: string;
    dueAt: string | null;
    includePathsInShare: boolean;
    allowCopyExport: boolean;
  };
};

export default function SiteUpdateShare() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SharedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(apiUrl(`/api/site-updates/share/${encodeURIComponent(token || "")}`));
        const j = await readJsonResponse<{ session?: SharedSession; error?: string }>(r, {});
        if (!r.ok || !j.session) throw new Error(j.error || "Not found");
        if (!cancelled) setSession(j.session);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copyText = async () => {
    if (!session) return;
    if (!session.advanced.allowCopyExport) return toast.error("Export disabled");
    const full = {
      ...session,
      shareEnabled: true,
      shareToken: token ?? null,
      createdAt: session.updatedAt,
      advanced: {
        priority: (session.advanced.priority as "normal") || "normal",
        visibility: "shareable" as const,
        tags: session.advanced.tags,
        assignee: session.advanced.assignee,
        dueAt: session.advanced.dueAt,
        pinned: false,
        includePathsInShare: session.advanced.includePathsInShare,
        allowCopyExport: session.advanced.allowCopyExport,
      },
    } satisfies SiteUpdateSession;
    await navigator.clipboard.writeText(formatSessionExport(full));
    toast.success("Copied");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading shared brief…
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card className="space-y-3 p-6">
          <h1 className="text-lg font-semibold">Share link unavailable</h1>
          <p className="text-sm text-muted-foreground">{error || "Not found"}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Go home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Shared site update brief</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{session.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {new Date(session.updatedAt).toLocaleString()}
            </p>
          </div>
          {session.advanced.allowCopyExport ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void copyText()}>
              <Copy className="mr-1 h-4 w-4" /> Copy
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{session.status}</Badge>
          <Badge variant="secondary">{session.advanced.priority}</Badge>
          {session.advanced.assignee ? <Badge variant="outline">@{session.advanced.assignee}</Badge> : null}
          {session.advanced.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>

        <ol className="space-y-4">
          {session.items.map((item, i) => {
            const page = findSiteUpdatePage(item.pageId);
            const opt = findSiteUpdateOption(item.pageId, item.optionId);
            return (
              <li key={item.id} className="rounded-lg border p-4">
                <p className="text-sm font-medium">
                  {i + 1}. {page?.label ?? item.pageId}
                </p>
                {opt ? <p className="mt-0.5 text-xs text-muted-foreground">Option: {opt.label}</p> : null}
                {session.advanced.includePathsInShare && page?.path ? (
                  <p className="text-[11px] text-muted-foreground">{page.path}</p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.description || "—"}</p>
                {item.advanced?.note ? (
                  <p className="mt-2 text-xs text-muted-foreground">Note: {item.advanced.note}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
