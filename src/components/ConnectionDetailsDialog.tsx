import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  CircleDot,
  FileQuestion,
  GraduationCap,
  Info,
  Layers,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type EmbeddingRow = {
  id: string;
  table: string;
  column: string;
  embeds: string;
  whenCreated: string[];
  features: string[];
  active: boolean;
  api?: string;
};

const EMBEDDING_MODEL = "models/gemini-embedding-001";
const EMBEDDING_DIM = 768;

const EMBEDDINGS: EmbeddingRow[] = [
  {
    id: "key-points",
    table: "key_points",
    column: "embedding",
    embeds: "প্রতিটি key point-এর content (high-yield line)",
    whenCreated: [
      "Concept save (/api/save-concept)",
      "Key point add / edit",
      "Suggestions থেকে key point save",
    ],
    features: [
      "Home — Create Concept: extract-এর পর লাইন match",
      "Create Question (AI) — question ↔ suggestion link",
      "Concept lookup fallback — title দিয়ে semantic search",
    ],
    active: true,
    api: "POST /api/match-key-points → RPC match_key_points",
  },
  {
    id: "concept-detail",
    table: "concepts",
    column: "detail_embedding",
    embeds: "detail_summary + paragraphs + table (title, headers, cells)",
    whenCreated: ["Concept save", "Concept detail edit (PATCH /api/concepts/:id)"],
    features: ["DB-তে ivfflat index আছে", "Search / match UI-তে এখনো ব্যবহার হয় না"],
    active: false,
  },
  {
    id: "question-stem",
    table: "questions",
    column: "embedding",
    embeds: "MCQ / SBA question stem",
    whenCreated: ["Question save (/api/save-question)", "Question edit (PATCH /api/questions/:id)"],
    features: ["Vector সংরক্ষিত", "Similar / duplicate question search এখনো নেই"],
    active: false,
  },
  {
    id: "question-explanation",
    table: "questions",
    column: "explanation_embedding",
    embeds: "MCQ: T/F statement + explanation · SBA: option + explanation",
    whenCreated: ["Question save (explanation থাকলে)", "Question edit"],
    features: ["Vector সংরক্ষিত", "Explanation-based search এখনো নেই"],
    active: false,
  },
  {
    id: "exam-title",
    table: "exams",
    column: "title_embedding",
    embeds: "Exam title + description",
    whenCreated: ["Exam create", "Exam update"],
    features: ["Vector সংরক্ষিত", "Similar exam search এখনো নেই"],
    active: false,
  },
];

const SETTINGS_LINKS = [
  {
    label: "Settings → AI Prompts → Matching",
    detail: "Vector match on/off, threshold, AI re-score (Gemini)",
  },
  {
    label: "Settings → Gemini API",
    detail: "Embedding API keys (rotation)",
  },
  {
    label: "Connection → Backup / Migrate",
    detail: "Embeddings include বা skip করার অপশন",
  },
  {
    label: "Debug API",
    detail: "GET /api/debug/embeddings-stats — key_points sample stats",
  },
];

function RowIcon({ active }: { active: boolean }) {
  return active ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
  ) : (
    <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
  );
}

function EmbeddingCard({ row }: { row: EmbeddingRow }) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        row.active ? "border-emerald-500/30 bg-emerald-500/5" : "bg-muted/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <RowIcon active={row.active} />
          <div className="min-w-0">
            <p className="font-mono text-sm font-medium">
              {row.table}.{row.column}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.embeds}</p>
          </div>
        </div>
        <Badge variant={row.active ? "default" : "secondary"} className="shrink-0">
          {row.active ? "Active — search/match" : "Save only"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <div>
          <p className="font-medium text-muted-foreground mb-1.5">কখন তৈরি হয়</p>
          <ul className="space-y-1 list-disc list-inside text-foreground/90">
            {row.whenCreated.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-muted-foreground mb-1.5">কোথায় / কী হয়</p>
          <ul className="space-y-1 list-disc list-inside text-foreground/90">
            {row.features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {row.api ? (
        <p className="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1.5 break-all">
          {row.api}
        </p>
      ) : null}
    </div>
  );
}

export function ConnectionDetailsDialog() {
  const activeCount = EMBEDDINGS.filter((e) => e.active).length;
  const storedCount = EMBEDDINGS.length - activeCount;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-3.5 w-3.5 mr-1.5" />
          Show details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            Database & vector embedding overview
          </DialogTitle>
          <DialogDescription>
            কোথায় কী embedding করা হয়, কোনটা live feature-এ ব্যবহার হয় — সংক্ষিপ্ত ম্যাপ।
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-5.5rem)] px-6 pb-6">
          <div className="space-y-6 pr-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-2xl font-semibold">{EMBEDDINGS.length}</p>
                <p className="text-xs text-muted-foreground">Vector columns</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active (match/search)</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-semibold">{storedCount}</p>
                <p className="text-xs text-muted-foreground">Save only (future)</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4" />
                Embedding engine
              </div>
              <dl className="grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="font-mono mt-0.5">{EMBEDDING_MODEL}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dimensions</dt>
                  <dd className="font-mono mt-0.5">{EMBEDDING_DIM} (pgvector)</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Storage</dt>
                  <dd className="mt-0.5">PostgreSQL / Supabase — <code className="text-[11px]">vector(768)</code> + ivfflat index</dd>
                </div>
              </dl>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Vector embeddings by table</h3>
              </div>
              <div className="space-y-3">
                {EMBEDDINGS.map((row) => (
                  <EmbeddingCard key={row.id} row={row} />
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileQuestion className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Active matching flow</h3>
              </div>
              <div className="rounded-lg border p-4 text-xs space-y-2 bg-muted/20">
                <p className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline">Create Concept / Create Question AI</Badge>
                  <span>→</span>
                  <Badge variant="outline">POST /api/match-key-points</Badge>
                  <span>→</span>
                  <Badge variant="outline">key_points.embedding</Badge>
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Query text Gemini দিয়ে embed → pgvector cosine similarity → top key points। Settings-এ AI re-score
                  চালু থাকলে Gemini আবার percentage দেয়।
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Related settings & tools</h3>
              </div>
              <ul className="space-y-2">
                {SETTINGS_LINKS.map((item) => (
                  <li key={item.label} className="rounded-md border px-3 py-2 text-xs">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground mt-0.5">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-dashed p-4 flex gap-3 text-xs text-muted-foreground">
              <GraduationCap className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">সংক্ষেপ:</strong> এখন শুধু{" "}
                <code className="text-[11px]">key_points.embedding</code> দিয়ে suggestion matching চলে। বাকি ৪টি
                column save হয় — index DB-তে ready, UI search feature পরে যোগ করা যাবে।
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
