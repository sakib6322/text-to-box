import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Download, Map, Users, Sparkles, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COURSE_PLAN_META, COURSE_PLAN_SECTIONS } from "@/lib/courseMappingPlan";
import { downloadCourseMappingPlanPdf } from "@/lib/downloadCoursePlanPdf";

const QUICK_LINKS = [
  { to: "/admin/courses", label: "Courses", icon: BookOpen, desc: "Create & publish programs" },
  { to: "/admin/courses", label: "Mapping", icon: Map, desc: "Attach syllabus topics" },
  { to: "/admin/courses", label: "Routine", icon: CalendarDays, desc: "Date-based unlocks" },
  { to: "/admin/courses", label: "Enrollments", icon: Users, desc: "Assign students" },
];

export default function AdminDashboard() {
  const onDownload = () => {
    try {
      downloadCourseMappingPlanPdf();
      toast.success("Plan PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF download failed");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Home className="h-4 w-4" />
          <span className="text-foreground font-medium">Dashboard</span>
        </div>
        <Button type="button" onClick={onDownload} className="gap-2 shadow-sm">
          <Download className="h-4 w-4" />
          Download plan (PDF)
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
                {COURSE_PLAN_META.product}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                Course Mapping Module
              </h1>
              <p className="text-sm leading-relaxed text-slate-200/90 sm:text-base">
                {COURSE_PLAN_META.subtitle}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/25 border-0">
                  v{COURSE_PLAN_META.version}
                </Badge>
                <Badge className="bg-white/10 text-slate-100 hover:bg-white/15 border-0">
                  {COURSE_PLAN_META.date}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/25 border-0 gap-1">
                  <Sparkles className="h-3 w-3" /> Full ship
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="gap-2 bg-white text-slate-900 hover:bg-cyan-50"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
              Download plan PDF
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.label} to={q.to} className="group">
              <Card className="h-full p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm flex items-center gap-1">
                      {q.label}
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Implementation plan</h2>
            <p className="text-sm text-muted-foreground">
              Full specification — same content as the downloadable PDF.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {COURSE_PLAN_SECTIONS.map((section) => (
            <Card key={section.title} className="overflow-hidden border-slate-200/80">
              <div className="border-b bg-muted/30 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-foreground sm:text-base">{section.title}</h3>
              </div>
              <div className="space-y-3 px-4 py-4 sm:px-5">
                {section.body ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {section.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                        <span className="text-foreground/90 leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.subsections?.map((sub) => (
                  <div key={sub.title} className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                      {sub.title}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {sub.bullets.map((b) => (
                        <li key={b} className="leading-relaxed">
                          – {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
