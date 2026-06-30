import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { fetchTaxonomy } from "@/lib/taxonomy";

export function DatabaseConnectionPanel() {
  const [subjectCount, setSubjectCount] = useState<number | null>(null);

  const loadCounts = useCallback(async () => {
    try {
      const items = await fetchTaxonomy("subjects");
      setSubjectCount(items.length);
    } catch {
      setSubjectCount(null);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const hasPublishableKey = Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const apiBase = import.meta.env.VITE_API_URL?.trim() || "(Vite proxy → :8787)";

  return (
    <div className="space-y-6">
      <ConnectionStatus onStatusChange={() => loadCounts()} />

      <Card className="p-4 space-y-4 border-dashed">
        <h3 className="text-sm font-semibold">Environment (from .env)</h3>
        <p className="text-xs text-muted-foreground">
          These values are loaded at build/dev time. Restart <code className="text-xs">npm run dev</code> after
          changing .env.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">VITE_SUPABASE_PROJECT_ID</Label>
            <Input readOnly value={projectId} className="font-mono text-xs bg-muted/50" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">VITE_SUPABASE_URL</Label>
            <Input readOnly value={supabaseUrl} className="font-mono text-xs bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</Label>
            <Input readOnly value={hasPublishableKey ? "•••• configured" : "Not set"} className="text-xs bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VITE_API_URL</Label>
            <Input readOnly value={apiBase} className="font-mono text-xs bg-muted/50" />
          </div>
        </div>
        {subjectCount != null ? (
          <p className="text-xs text-muted-foreground">
            Live taxonomy: <strong>{subjectCount}</strong> subject(s) loaded from database via API.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
