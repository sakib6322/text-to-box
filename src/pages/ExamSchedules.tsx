import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Clock, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { deleteExam, fetchExam, fetchExams, formatDuration, formatScheduleRange, type ExamQuestion, type ExamSummary } from "@/lib/exams";
import { ExamPaperLoading, ExamPaperView } from "@/components/ExamPaperView";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-neutral-500/15 text-neutral-600",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function ExamSchedules() {
  const [params] = useSearchParams();
  const highlight = params.get("highlight");
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ exam: ExamSummary; questions: ExamQuestion[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExams(await fetchExams());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPreview = async (exam: ExamSummary) => {
    setPreviewLoading(true);
    setPreview({ exam, questions: [] });
    try {
      const data = await fetchExam(exam.id);
      setPreview(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      toast.success("Exam deleted");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title-static text-xl">Exam schedules</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Preview · Edit · Delete</p>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/exam/create">
            <Plus className="h-4 w-4 mr-1" /> Create
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          No exams yet.{" "}
          <Link to="/admin/exam/create" className="text-primary underline">
            Create one
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card
              key={exam.id}
              className={`p-4 space-y-3 ${highlight === exam.id ? "ring-2 ring-primary/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-base truncate">{exam.title}</h2>
                  {exam.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{exam.description}</p>
                  ) : null}
                </div>
                <Badge className={statusColor[exam.status] ?? statusColor.draft}>{exam.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDuration(exam.durationMinutes)}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formatScheduleRange(exam.scheduledStart, exam.scheduledEnd)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{exam.questionCount ?? 0} questions</Badge>
                <Badge variant="secondary" className="tabular-nums">{exam.totalMarks} marks</Badge>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openPreview(exam)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/admin/exam/create?id=${exam.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(exam)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.exam.title ?? "Preview"}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <ExamPaperLoading />
          ) : preview ? (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>{formatDuration(preview.exam.durationMinutes)}</Badge>
                <Badge variant="outline">{preview.questions.length} Q</Badge>
                <Badge variant="secondary">{preview.exam.totalMarks} marks</Badge>
              </div>
              <ExamPaperView questions={preview.questions} showConceptButtons />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete exam?"
        description={deleteTarget ? <>Exam <strong>{deleteTarget.title}</strong> will be permanently deleted.</> : null}
        confirming={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
