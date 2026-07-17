import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ConnectionDetailsDialog } from "@/components/ConnectionDetailsDialog";
import { toast } from "sonner";
import {
  Copy,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Zap,
} from "lucide-react";
import {
  downloadDatabaseBackup,
  createDatabaseBackup,
  fetchDatabaseConfig,
  fetchDatabaseStats,
  fetchEnvSnippet,
  fetchMigrationJob,
  formatBytes,
  listDatabaseBackups,
  saveDatabaseConfig,
  startDatabaseMigration,
  testPostgresConfig,
  testSupabaseConfig,
  type BackupInfo,
  type MigrationJob,
  type PostgresConfig,
  type SupabaseConfig,
} from "@/lib/databaseConnection";

const emptySupabase = (): SupabaseConfig => ({
  projectId: "",
  url: "",
  anonKey: "",
  serviceRoleKey: "",
});

const emptyPostgres = (): PostgresConfig => ({
  host: "",
  port: 5432,
  database: "",
  user: "",
  password: "",
  ssl: false,
  connectionString: "",
});

export function DatabaseConnectionPanel() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meta, setMeta] = useState<{ connected?: boolean; source?: string; supabase_url?: string }>({});
  const [supabase, setSupabase] = useState<SupabaseConfig>(emptySupabase());
  const [postgres, setPostgres] = useState<PostgresConfig>(emptyPostgres());
  const [writeEnv, setWriteEnv] = useState(false);
  const [envSnippet, setEnvSnippet] = useState("");
  const [stats, setStats] = useState<Record<string, { ok: boolean; count: number | null }>>({});
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [migrationJob, setMigrationJob] = useState<MigrationJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [migrateOpts, setMigrateOpts] = useState({
    truncateTarget: false,
    runSchema: true,
    includeEmbeddings: true,
    includeSql: true,
    onConflict: "nothing" as "nothing" | "update",
  });
  const [backupOpts, setBackupOpts] = useState({ includeSql: true, includeEmbeddings: true });

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setInitialLoading(true);
    try {
      const [cfgRes, statsRes, backupsRes, snippetRes] = await Promise.all([
        fetchDatabaseConfig(),
        fetchDatabaseStats().catch(() => null),
        listDatabaseBackups().catch(() => ({ backups: [] as BackupInfo[] })),
        fetchEnvSnippet().catch(() => ({ snippet: "" })),
      ]);
      if (cfgRes.config) {
        setSupabase({
          projectId: cfgRes.config.supabase.projectId ?? "",
          url: cfgRes.config.supabase.url ?? "",
          anonKey: "",
          serviceRoleKey: "",
        });
        setPostgres({
          host: cfgRes.config.postgres.host ?? "",
          port: cfgRes.config.postgres.port ?? 5432,
          database: cfgRes.config.postgres.database ?? "",
          user: cfgRes.config.postgres.user ?? "",
          password: "",
          ssl: cfgRes.config.postgres.ssl ?? false,
          connectionString: "",
        });
      }
      setMeta(cfgRes.meta ?? {});
      if (statsRes?.stats) setStats(statsRes.stats);
      setBackups(backupsRes.backups ?? []);
      setEnvSnippet(snippetRes.snippet ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load database settings");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadAll]);

  const saveConfig = async () => {
    setBusy("save");
    try {
      const body: Parameters<typeof saveDatabaseConfig>[0] = { writeEnv };
      if (supabase.projectId || supabase.url) body.supabase = { ...supabase };
      if (postgres.host || postgres.connectionString) body.postgres = { ...postgres };
      const res = await saveDatabaseConfig(body);
      if (res.envSnippet) setEnvSnippet(res.envSnippet);
      toast.success(writeEnv ? "Saved and updated .env" : "Database connection saved");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const testSupabase = async () => {
    setBusy("test-sb");
    try {
      const res = await testSupabaseConfig({ supabase });
      if (res.ok) toast.success(`Supabase OK (${res.latencyMs}ms)`);
      else toast.error(res.error ?? "Supabase test failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(null);
    }
  };

  const testPostgres = async () => {
    setBusy("test-pg");
    try {
      const res = await testPostgresConfig({ postgres });
      if (res.ok) toast.success(`PostgreSQL OK — ${res.version?.slice(0, 40)}…`);
      else toast.error(res.error ?? "PostgreSQL test failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(null);
    }
  };

  const runBackup = async () => {
    setBusy("backup");
    try {
      const res = await createDatabaseBackup(backupOpts);
      toast.success(`Backup created (${Object.keys(res.backup.tableCounts).length} tables)`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(null);
    }
  };

  const pollMigration = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const job = await fetchMigrationJob(jobId);
        setMigrationJob(job);
        if (job.status === "completed") {
          toast.success("Migration completed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (job.status === "failed") {
          toast.error(job.error ?? "Migration failed");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
  };

  const runMigration = async () => {
    setBusy("migrate");
    setMigrationJob(null);
    try {
      const { jobId } = await startDatabaseMigration({
        ...migrateOpts,
        postgresConfig: { postgres },
      });
      toast.info("Migration started…");
      pollMigration(jobId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Migration failed to start");
    } finally {
      setBusy(null);
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      toast.success("Copied .env snippet");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading connection settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectionStatus />

      <Card className="p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Active connection</p>
          <p className="text-xs text-muted-foreground font-mono break-all">
            {meta.supabase_url || "Not configured"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={meta.connected ? "default" : "destructive"}>
            {meta.connected ? "Connected" : "Disconnected"}
          </Badge>
          {meta.source ? <Badge variant="outline">source: {meta.source}</Badge> : null}
          <ConnectionDetailsDialog />
          <Button variant="outline" size="sm" onClick={() => loadAll({ silent: true })} disabled={Boolean(busy) || refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="supabase">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="supabase">Supabase</TabsTrigger>
          <TabsTrigger value="postgres">VPS PostgreSQL</TabsTrigger>
          <TabsTrigger value="backup">Backup & Download</TabsTrigger>
          <TabsTrigger value="migrate">Migrate → VPS</TabsTrigger>
          <TabsTrigger value="stats">Table stats</TabsTrigger>
        </TabsList>

        <TabsContent value="supabase" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Supabase configuration</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your Supabase project details. Service role key is used by the API server. Leave key fields empty
              when saving to keep existing secrets.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Project ID</Label>
                <Input
                  value={supabase.projectId}
                  onChange={(e) => setSupabase((s) => ({ ...s, projectId: e.target.value }))}
                  placeholder="abcdefghijklmnop"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Supabase URL</Label>
                <Input
                  value={supabase.url}
                  onChange={(e) => setSupabase((s) => ({ ...s, url: e.target.value.trim() }))}
                  placeholder="https://xxxx.supabase.co"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Anon / Publishable key (VITE_SUPABASE_PUBLISHABLE_KEY)</Label>
                <Input
                  type="password"
                  value={supabase.anonKey}
                  onChange={(e) => setSupabase((s) => ({ ...s, anonKey: e.target.value }))}
                  placeholder="Leave empty to keep current"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Service role key (server — keep secret)</Label>
                <Input
                  type="password"
                  value={supabase.serviceRoleKey}
                  onChange={(e) => setSupabase((s) => ({ ...s, serviceRoleKey: e.target.value }))}
                  placeholder="Leave empty to keep current"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={writeEnv} onCheckedChange={setWriteEnv} id="write-env" />
                <Label htmlFor="write-env" className="text-xs cursor-pointer">
                  Also write to .env file on save
                </Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveConfig} disabled={busy === "save"}>
                {busy === "save" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save & apply
              </Button>
              <Button size="sm" variant="outline" onClick={testSupabase} disabled={busy === "test-sb"}>
                {busy === "test-sb" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                Test connection
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-3 border-dashed">
            <h3 className="text-sm font-semibold">Frontend note</h3>
            <p className="text-xs text-muted-foreground">
              Browser Supabase client still reads <code className="text-xs">VITE_*</code> at build time. After changing
              keys, restart <code className="text-xs">npm run dev</code> or copy the snippet below into{" "}
              <code className="text-xs">.env</code>.
            </p>
            <Textarea readOnly value={envSnippet} className="font-mono text-xs min-h-[140px] bg-muted/40" />
            <Button size="sm" variant="outline" onClick={copySnippet}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy .env snippet
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="postgres" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <h3 className="text-sm font-semibold">VPS PostgreSQL</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure your VPS PostgreSQL (e.g. 187.127.166.35). Use either connection string or host fields.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Connection string (optional — overrides host fields)</Label>
              <Input
                type="password"
                value={postgres.connectionString}
                onChange={(e) => setPostgres((p) => ({ ...p, connectionString: e.target.value }))}
                placeholder="postgresql://user:pass@host:5432/dbname"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Host</Label>
                <Input
                  value={postgres.host}
                  onChange={(e) => setPostgres((p) => ({ ...p, host: e.target.value }))}
                  placeholder="187.127.166.35"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Port</Label>
                <Input
                  type="number"
                  value={postgres.port}
                  onChange={(e) => setPostgres((p) => ({ ...p, port: Number(e.target.value) || 5432 }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Database</Label>
                <Input
                  value={postgres.database}
                  onChange={(e) => setPostgres((p) => ({ ...p, database: e.target.value }))}
                  placeholder="pg_diary"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">User</Label>
                <Input
                  value={postgres.user}
                  onChange={(e) => setPostgres((p) => ({ ...p, user: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  value={postgres.password}
                  onChange={(e) => setPostgres((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Leave empty to keep current"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={postgres.ssl}
                onCheckedChange={(v) => setPostgres((p) => ({ ...p, ssl: v }))}
                id="pg-ssl"
              />
              <Label htmlFor="pg-ssl" className="text-xs cursor-pointer">
                Use SSL
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveConfig} disabled={busy === "save"}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save PostgreSQL config
              </Button>
              <Button size="sm" variant="outline" onClick={testPostgres} disabled={busy === "test-pg"}>
                {busy === "test-pg" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                Test PostgreSQL
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Create backup</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Export all app tables from Supabase to JSON (and optional SQL) stored on the API server.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={backupOpts.includeSql}
                  onCheckedChange={(v) => setBackupOpts((o) => ({ ...o, includeSql: v }))}
                  id="bk-sql"
                />
                <Label htmlFor="bk-sql" className="text-xs cursor-pointer">
                  Also generate .sql file
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={backupOpts.includeEmbeddings}
                  onCheckedChange={(v) => setBackupOpts((o) => ({ ...o, includeEmbeddings: v }))}
                  id="bk-emb"
                />
                <Label htmlFor="bk-emb" className="text-xs cursor-pointer">
                  Include vector embeddings
                </Label>
              </div>
            </div>
            <Button size="sm" onClick={runBackup} disabled={busy === "backup"}>
              {busy === "backup" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Create backup now
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Saved backups</h3>
            {backups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No backups yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.id}</TableCell>
                      <TableCell className="text-xs">{new Date(b.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{formatBytes(b.sizeBytes)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => void downloadDatabaseBackup(b.id, "json").catch((e) => toast.error(e instanceof Error ? e.message : "Download failed"))}
                        >
                          JSON
                        </Button>
                        {b.hasSql ? (
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => void downloadDatabaseBackup(b.id, "sql").catch((e) => toast.error(e instanceof Error ? e.message : "Download failed"))}
                          >
                            SQL
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="migrate" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Supabase → VPS PostgreSQL migration</h3>
            <p className="text-xs text-muted-foreground">
              Copies all tables from the active Supabase connection into your VPS PostgreSQL. Configure VPS PostgreSQL
              in the previous tab first, then run migration.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={migrateOpts.runSchema}
                  onCheckedChange={(v) => setMigrateOpts((o) => ({ ...o, runSchema: v }))}
                  id="mg-schema"
                />
                <Label htmlFor="mg-schema" className="text-xs cursor-pointer">
                  Run SQL migrations on target (create tables + pgvector)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={migrateOpts.truncateTarget}
                  onCheckedChange={(v) => setMigrateOpts((o) => ({ ...o, truncateTarget: v }))}
                  id="mg-trunc"
                />
                <Label htmlFor="mg-trunc" className="text-xs cursor-pointer">
                  Truncate target tables first (destructive)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={migrateOpts.includeEmbeddings}
                  onCheckedChange={(v) => setMigrateOpts((o) => ({ ...o, includeEmbeddings: v }))}
                  id="mg-emb"
                />
                <Label htmlFor="mg-emb" className="text-xs cursor-pointer">
                  Include vector embeddings
                </Label>
              </div>
            </div>
            <Button size="sm" onClick={runMigration} disabled={busy === "migrate"}>
              {busy === "migrate" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Start migration
            </Button>
          </Card>

          {migrationJob ? (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={migrationJob.status === "completed" ? "default" : migrationJob.status === "failed" ? "destructive" : "secondary"}>
                  {migrationJob.status}
                </Badge>
                {migrationJob.error ? (
                  <span className="text-xs text-destructive">{migrationJob.error}</span>
                ) : null}
              </div>
              <div className="max-h-64 overflow-auto space-y-1">
                {migrationJob.progress.map((step, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground">
                    {String(step.step)} — {String(step.status)}
                    {step.exported != null ? ` (${step.exported} rows)` : ""}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Table row counts</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats).map(([table, s]) => (
                  <TableRow key={table}>
                    <TableCell className="font-mono text-xs">{table}</TableCell>
                    <TableCell>
                      <Badge variant={s.ok ? "outline" : "destructive"}>{s.ok ? "OK" : "Error"}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{s.count ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
