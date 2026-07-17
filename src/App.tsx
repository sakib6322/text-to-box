import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShellProvider } from "@/components/AppShellContext";
import { UiAppearanceProvider } from "@/components/UiAppearanceProvider";
import { Loader2 } from "lucide-react";

const RoleBasedHome = lazy(() => import("./components/RoleBasedHome.tsx"));
const MySuggestions = lazy(() => import("./pages/MySuggestions.tsx"));
const Suggestions = lazy(() => import("./pages/Suggestions.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout.tsx"));
const AppSidebarLayout = lazy(() => import("./layouts/AppSidebarLayout.tsx"));
const CreateQuestionAI = lazy(() => import("./pages/CreateQuestionAI.tsx"));
const AdminPlaceholder = lazy(() => import("./pages/AdminPlaceholder.tsx"));
const AllQuestions = lazy(() => import("./pages/AllQuestions.tsx"));
const AdminSettings = lazy(() => import("./pages/AdminSettings.tsx"));
const AdminAppearance = lazy(() => import("./pages/AdminAppearance.tsx"));
const CreateExam = lazy(() => import("./pages/CreateExam.tsx"));
const ExamSchedules = lazy(() => import("./pages/ExamSchedules.tsx"));
const MyExams = lazy(() => import("./pages/MyExams.tsx"));
const TakeExam = lazy(() => import("./pages/TakeExam.tsx"));
const ExamResult = lazy(() => import("./pages/ExamResult.tsx"));
const ConceptLearn = lazy(() => import("./pages/ConceptLearn.tsx"));
const ConceptDetailPage = lazy(() => import("./pages/ConceptDetailPage.tsx"));
const PracticeTake = lazy(() => import("./pages/PracticeTake.tsx"));
const StudyProgressPage = lazy(() => import("./pages/StudyProgressPage.tsx"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UiAppearanceProvider>
        <AppShellProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppSidebarLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<RoleBasedHome />} />
                  <Route path="suggestions" element={<Suggestions mode="admin" />} />
                  <Route path="my-suggestions" element={<MySuggestions />} />
                  <Route path="my-exams" element={<MyExams />} />
                  <Route path="my-exams/take/:examId" element={<TakeExam />} />
                  <Route path="my-exams/result/:attemptId" element={<ExamResult />} />
                  <Route path="concept/:conceptId/learn" element={<ConceptLearn />} />
                  <Route path="concept/:conceptId/details" element={<ConceptDetailPage />} />
                  <Route path="study/:conceptId" element={<ConceptLearn />} />
                  <Route path="practice/:conceptId/setup" element={<ConceptLearn />} />
                  <Route path="practice/session/:sessionId" element={<PracticeTake />} />
                  <Route path="study/progress" element={<StudyProgressPage />} />
                </Route>
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminArea>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminPlaceholder />} />
                  <Route path="academic/classes" element={<AdminPlaceholder />} />
                  <Route path="academic/subjects" element={<AdminPlaceholder />} />
                  <Route
                    path="question-bank/create-ai"
                    element={
                      <ProtectedRoute permission="question_bank.create_ai.view">
                        <CreateQuestionAI />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="question-bank/questions"
                    element={
                      <ProtectedRoute permission="question_bank.questions.view">
                        <AllQuestions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exam/create"
                    element={
                      <ProtectedRoute permission="exam.create.view">
                        <CreateExam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="exam/schedules"
                    element={
                      <ProtectedRoute permission="exam.schedules.view">
                        <ExamSchedules />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="practice-sheets" element={<AdminPlaceholder />} />
                  <Route path="students" element={<AdminPlaceholder />} />
                  <Route path="teachers" element={<AdminPlaceholder />} />
                  <Route path="organization" element={<AdminPlaceholder />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route
                    path="settings/appearance"
                    element={
                      <ProtectedRoute permission="settings.appearance.view">
                        <AdminAppearance />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppShellProvider>
      </UiAppearanceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
