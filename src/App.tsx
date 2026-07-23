import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShellProvider } from "@/components/AppShellContext";
import { UiAppearanceProvider } from "@/components/UiAppearanceProvider";
import { lazyPage, PageFallback } from "@/components/lazyPage";

const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));

const RoleBasedHome = lazyPage(() => import("./components/RoleBasedHome.tsx"));
const MySuggestions = lazyPage(() => import("./pages/MySuggestions.tsx"));
const Suggestions = lazyPage(() => import("./pages/Suggestions.tsx"));
const Login = lazyPage(() => import("./pages/Login.tsx"));
const NotFound = lazyPage(() => import("./pages/NotFound.tsx"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout.tsx"));
const AppSidebarLayout = lazy(() => import("./layouts/AppSidebarLayout.tsx"));
const CreateQuestionAI = lazyPage(() => import("./pages/CreateQuestionAI.tsx"));
const AdminPlaceholder = lazyPage(() => import("./pages/AdminPlaceholder.tsx"));
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard.tsx"));
const AdminCourses = lazyPage(() => import("./pages/AdminCourses.tsx"));
const AdminCourseMapping = lazyPage(() => import("./pages/AdminCourseMapping.tsx"));
const AdminCourseRoutine = lazyPage(() => import("./pages/AdminCourseRoutine.tsx"));
const AdminCourseEnrollments = lazyPage(() => import("./pages/AdminCourseEnrollments.tsx"));
const AllQuestions = lazyPage(() => import("./pages/AllQuestions.tsx"));
const AdminSettings = lazyPage(() => import("./pages/AdminSettings.tsx"));
const AdminAppearance = lazyPage(() => import("./pages/AdminAppearance.tsx"));
const CreateExam = lazyPage(() => import("./pages/CreateExam.tsx"));
const ExamSchedules = lazyPage(() => import("./pages/ExamSchedules.tsx"));
const MyExams = lazyPage(() => import("./pages/MyExams.tsx"));
const TakeExam = lazyPage(() => import("./pages/TakeExam.tsx"));
const ExamResult = lazyPage(() => import("./pages/ExamResult.tsx"));
const ConceptLearn = lazyPage(() => import("./pages/ConceptLearn.tsx"));
const ConceptDetailPage = lazyPage(() => import("./pages/ConceptDetailPage.tsx"));
const PracticeTake = lazyPage(() => import("./pages/PracticeTake.tsx"));
const PracticeSetup = lazyPage(() => import("./pages/PracticeSetup.tsx"));
const StudyProgressPage = lazyPage(() => import("./pages/StudyProgressPage.tsx"));
const MyProfile = lazyPage(() => import("./pages/MyProfile.tsx"));
const CourseLanding = lazyPage(() => import("./pages/CourseLanding.tsx"));
const CoursePublicDetail = lazyPage(() => import("./pages/CoursePublicDetail.tsx"));
const MyCourses = lazyPage(() => import("./pages/MyCourses.tsx"));
const MyCourseBrowse = lazyPage(() => import("./pages/MyCourseBrowse.tsx"));
const MyCourseTopic = lazyPage(() => import("./pages/MyCourseTopic.tsx"));
const ProgressSetTake = lazyPage(() => import("./pages/ProgressSetTake.tsx"));
const StudyMistakesPage = lazyPage(() => import("./pages/StudyMistakesPage.tsx"));
const AdminProgressSets = lazyPage(() => import("./pages/AdminProgressSets.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ShellFallback() {
  return <PageFallback label="Loading app…" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300}>
      <UiAppearanceProvider>
        <AppShellProvider>
          <Suspense fallback={null}>
            <Toaster />
            <Sonner />
          </Suspense>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<CourseLanding />} />
              <Route path="/courses/:slug" element={<CoursePublicDetail />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<ShellFallback />}>
                      <AppSidebarLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route path="builder" element={<RoleBasedHome />} />
                <Route path="suggestions" element={<Suggestions mode="admin" />} />
                <Route path="my-suggestions" element={<MySuggestions />} />
                <Route path="my-courses" element={<MyCourses />} />
                <Route path="my-courses/:courseId" element={<MyCourseBrowse />} />
                <Route path="my-courses/:courseId/topics/:topicId" element={<MyCourseTopic />} />
                <Route path="my-exams" element={<MyExams />} />
                <Route path="my-exams/take/:examId" element={<TakeExam />} />
                <Route path="my-exams/result/:attemptId" element={<ExamResult />} />
                <Route path="concept/:conceptId/learn" element={<ConceptLearn />} />
                <Route path="concept/:conceptId/details" element={<ConceptDetailPage />} />
                <Route path="study/:conceptId" element={<ConceptLearn />} />
                <Route path="practice/:conceptId/setup" element={<PracticeSetup />} />
                <Route path="practice/session/:sessionId" element={<PracticeTake />} />
                <Route path="study/progress" element={<StudyProgressPage />} />
                <Route path="study/mistakes" element={<StudyMistakesPage />} />
                <Route path="progress/set/:setId" element={<ProgressSetTake />} />
                <Route path="profile" element={<MyProfile />} />
              </Route>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminArea>
                    <Suspense fallback={<ShellFallback />}>
                      <AdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="academic/classes" element={<AdminPlaceholder />} />
                <Route path="academic/subjects" element={<AdminPlaceholder />} />
                <Route
                  path="courses"
                  element={
                    <ProtectedRoute permission="courses.view">
                      <AdminCourses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="courses/:id/mapping"
                  element={
                    <ProtectedRoute permission="courses.mapping.edit">
                      <AdminCourseMapping />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="courses/:id/routine"
                  element={
                    <ProtectedRoute permission="courses.routine.edit">
                      <AdminCourseRoutine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="courses/:id/enrollments"
                  element={
                    <ProtectedRoute permission="courses.enroll.manage">
                      <AdminCourseEnrollments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="courses/:id/progress-sets"
                  element={
                    <ProtectedRoute permission="progress.sets.manage">
                      <AdminProgressSets />
                    </ProtectedRoute>
                  }
                />
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
          </BrowserRouter>
        </AppShellProvider>
      </UiAppearanceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
