import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";

type Topic = {
  topic_id: string;
  topic_name: string;
  path: string;
  stars: number;
  concept_count: number;
};

type SystemBlock = {
  system_id: string;
  system_name: string | null;
  subject_name: string | null;
  unlocked: boolean;
  publish_date: string | null;
  label: string;
  topics: Topic[];
};

function Stars({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex text-amber-500" aria-label={`${n} stars`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

export default function MyCourseBrowse() {
  const { courseId = "" } = useParams();
  const [name, setName] = useState("Course");
  const [today, setToday] = useState("");
  const [systems, setSystems] = useState<SystemBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/me/courses/${courseId}/browse`), { headers: getAuthHeaders() });
        const j = (await r.json().catch(() => ({}))) as {
          course?: { name: string };
          today?: string;
          systems?: SystemBlock[];
          error?: string;
        };
        if (!r.ok) throw new Error(j.error ?? "Failed to load");
        setName(j.course?.name ?? "Course");
        setToday(j.today ?? "");
        setSystems(j.systems ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Button asChild variant="ghost" size="sm">
        <Link to="/my-courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> My courses
        </Link>
      </Button>
      <div>
        <h1 className="page-title">{name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unlocked by routine date · today (Dhaka): {today || "—"}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : systems.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No mapped topics yet. Ask your admin to map the syllabus and publish a routine.
        </Card>
      ) : (
        <div className="space-y-3">
          {systems.map((sys) => (
            <Card key={sys.system_id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {sys.subject_name ? `${sys.subject_name} · ` : ""}
                    {sys.system_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sys.publish_date
                      ? sys.unlocked
                        ? `Unlocked · ${sys.publish_date}`
                        : `Unlocks on ${sys.publish_date}`
                      : "Not scheduled"}
                    {sys.label ? ` · ${sys.label}` : ""}
                  </p>
                </div>
                {sys.unlocked ? (
                  <Badge>Open</Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
              {sys.unlocked ? (
                <ul className="divide-y">
                  {sys.topics.map((t) => (
                    <li key={t.topic_id}>
                      <Link
                        to={`/my-courses/${courseId}/topics/${t.topic_id}`}
                        className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/40"
                      >
                        <span>
                          <span className="font-medium">{t.topic_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{t.concept_count} concepts</span>
                        </span>
                        <Stars n={t.stars} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Content stays hidden until the publish date.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
