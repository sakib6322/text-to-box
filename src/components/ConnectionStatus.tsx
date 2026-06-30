import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { fetchConnectionStatus, type ConnectionStatus as Status } from "@/lib/connectionStatus";

type Props = {
  compact?: boolean;
  onStatusChange?: (status: Status) => void;
};

export function ConnectionStatus({ compact, onStatusChange }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await fetchConnectionStatus();
    setStatus(s);
    onStatusChange?.(s);
    setLoading(false);
  }, [onStatusChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking API…
      </div>
    );
  }

  if (!status) return null;

  const allTablesOk = Object.values(status.tables).length > 0 && Object.values(status.tables).every((t) => t.ok);
  const connected = status.apiOk && status.dbOk;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={connected ? "default" : "destructive"}
          className="gap-1 text-[10px] font-normal"
        >
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? "API + DB connected" : "Connection issue"}
        </Badge>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }


  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">API & database</span>
        <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Test connection
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={status.apiOk ? "default" : "destructive"}>API {status.apiOk ? "OK" : "Down"}</Badge>
        <Badge variant={status.dbOk ? "default" : "destructive"}>Database {status.dbOk ? "OK" : "Error"}</Badge>
        {allTablesOk ? (
          <Badge variant="secondary">All taxonomy tables OK</Badge>
        ) : (
          <Badge variant="outline">Some tables missing</Badge>
        )}
      </div>
      {status.supabaseUrl ? (
        <p className="text-xs text-muted-foreground break-all">Supabase: {status.supabaseUrl}</p>
      ) : null}
      {status.error ? <p className="text-xs text-destructive">{status.error}</p> : null}
      {Object.keys(status.tables).length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
          {Object.entries(status.tables).map(([name, check]) => (
            <li key={name} className={check.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              {check.ok ? "✓" : "✗"} {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}


