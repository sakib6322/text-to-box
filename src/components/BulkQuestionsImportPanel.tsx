import { useRef, useState } from "react";
import { ClipboardCopy, FileJson, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Can, useCan } from "@/components/Can";
import { guardPermission } from "@/lib/permissionGuard";
import {
  buildExternalBulkQuestionsCsvPrompt,
  buildExternalBulkQuestionsPrompt,
  bulkItemsToDrafts,
  parseBulkQuestionsCsv,
  parseBulkQuestionsJson,
  type ParseBulkQuestionsResult,
} from "@/lib/bulkQuestionsJson";
import { mkQuestionId, type DraftQuestion } from "@/lib/questionDrafts";

type BoardOption = { id: string; name: string };

type ConceptCtx = {
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
};

type Props = {
  boardOptions: BoardOption[];
  concept: ConceptCtx;
  difficulty?: string;
  status?: string;
  marks?: number;
  queueLength: number;
  onImport: (drafts: DraftQuestion[]) => void;
};

/**
 * Compact bulk JSON/CSV import for question drafts (Create Question AI–style, no Gemini).
 */
export function BulkQuestionsImportPanel({
  boardOptions,
  concept,
  difficulty = "medium",
  status = "published",
  marks = 1,
  queueLength,
  onImport,
}: Props) {
  const canBulk = useCan("question_bank.create_ai.bulk");
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  const commit = (parsed: ParseBulkQuestionsResult, opts?: { jsonText?: string }) => {
    if (queueLength > 0) {
      const ok = window.confirm(
        `Replace the current queue of ${queueLength} question(s) with the bulk import?`,
      );
      if (!ok) return;
    }
    const mapped = bulkItemsToDrafts(parsed.items, {
      subject: concept.subject,
      system: concept.system,
      chapter: concept.chapter,
      topic: concept.topic,
      concept: concept.concept,
      boardOptions,
      difficulty,
      status,
      marks,
      mkId: mkQuestionId,
    });
    const allWarnings = [...parsed.warnings, ...mapped.warnings];
    for (const w of allWarnings.slice(0, 6)) toast.warning(w);
    if (allWarnings.length > 6) toast.warning(`${allWarnings.length - 6} more warning(s)…`);
    if (opts?.jsonText) setBulkJsonText(opts.jsonText);
    onImport(mapped.drafts);
    toast.success(
      `Imported ${mapped.drafts.length} question(s) · ${mapped.boardsResolved} board link(s)`,
    );
  };

  const importJson = async (rawOverride?: string) => {
    if (!guardPermission("question_bank.create_ai.bulk")) return;
    if (!concept.concept.trim()) {
      toast.error("Concept is required for bulk questions");
      return;
    }
    const raw = (rawOverride ?? bulkJsonText).trim();
    if (!raw) {
      toast.error("Paste JSON or upload a .json file first");
      return;
    }
    setImporting(true);
    try {
      commit(parseBulkQuestionsJson(raw), { jsonText: raw });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "JSON import failed");
    } finally {
      setImporting(false);
      if (jsonFileRef.current) jsonFileRef.current.value = "";
    }
  };

  const importCsv = async (file: File) => {
    if (!guardPermission("question_bank.create_ai.bulk")) return;
    if (!concept.concept.trim()) {
      toast.error("Concept is required for bulk questions");
      return;
    }
    setImporting(true);
    try {
      commit(parseBulkQuestionsCsv(await file.text()));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "CSV import failed");
    } finally {
      setImporting(false);
      if (csvFileRef.current) csvFileRef.current.value = "";
    }
  };

  const copyPrompt = async (format: "json" | "csv") => {
    const names = boardOptions.map((b) => b.name);
    const text =
      format === "csv"
        ? buildExternalBulkQuestionsCsvPrompt(names)
        : buildExternalBulkQuestionsPrompt(names);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(format === "csv" ? "CSV prompt copied" : "JSON prompt copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Can permission="question_bank.create_ai.bulk">
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <p className="text-sm font-medium">Bulk questions (no AI)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            CSV upload বা JSON paste — Create Question AI-এর মতো। Boards name দিয়ে auto-select।
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">CSV file</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!canBulk || importing}
            onClick={() => csvFileRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Upload questions CSV
          </Button>
          <Input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={!canBulk || importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCsv(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/samples/create-question-bulk.csv" download>
                Sample CSV
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => void copyPrompt("csv")}
            >
              <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
              Copy CSV prompt
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="kp-bulk-q-json" className="text-xs text-muted-foreground">
            JSON text
          </Label>
          <Textarea
            id="kp-bulk-q-json"
            value={bulkJsonText}
            onChange={(e) => canBulk && setBulkJsonText(e.target.value)}
            readOnly={!canBulk || importing}
            rows={6}
            className="font-mono text-xs min-h-[100px]"
            placeholder='{ "questions": [ { "type": "mcq", ... } ] }'
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={importing || !bulkJsonText.trim()}
              onClick={() => void importJson()}
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="mr-2 h-4 w-4" />
              )}
              Import JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => jsonFileRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload .json
            </Button>
            <Input
              ref={jsonFileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              disabled={!canBulk || importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                void (async () => {
                  try {
                    await importJson(await f.text());
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Failed to read file");
                  }
                })();
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => void copyPrompt("json")}
            >
              <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
              Copy JSON prompt
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/samples/create-question-bulk.json" download>
                Sample JSON
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Can>
  );
}
