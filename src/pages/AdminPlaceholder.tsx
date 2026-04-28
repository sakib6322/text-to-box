import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";

const titles: Record<string, { title: string; description: string }> = {
  "/admin": { title: "Dashboard", description: "Admin overview. Use the sidebar to open a section." },
  "/admin/academic/classes": { title: "Academic · Classes", description: "Manage academic classes and levels." },
  "/admin/academic/subjects": { title: "Academic · Subjects", description: "Manage subjects under each class." },
  "/admin/question-bank/questions": { title: "Question Bank · All Questions", description: "Browse and edit saved questions." },
  "/admin/exam/create": { title: "Exam · Create", description: "Build and schedule exams from the question bank." },
  "/admin/exam/schedules": { title: "Exam · Schedules", description: "View and manage exam schedules." },
  "/admin/practice-sheets": { title: "Practice Sheet", description: "Create and manage practice sheets for students." },
  "/admin/students": { title: "Students", description: "Student records and access." },
  "/admin/teachers": { title: "Teachers", description: "Teacher accounts and permissions." },
  "/admin/organization": { title: "Organization", description: "Organizational settings and branding." },
  "/admin/settings": { title: "Settings", description: "Admin and integration settings." },
};

function match(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  return { title: "Page", description: "This section is ready for your backend wiring." };
}

export default function AdminPlaceholder() {
  const location = useLocation();
  const { title, description } = useMemo(() => match(location.pathname), [location.pathname]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{title}</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/question-bank/create-ai">Create Question (AI)</Link>
        </Button>
      </div>
      <Card className="p-6">
        <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </Card>
    </div>
  );
}
