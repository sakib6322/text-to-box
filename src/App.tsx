import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import AppSidebarLayout from "./layouts/AppSidebarLayout.tsx";
import CreateQuestionAI from "./pages/CreateQuestionAI.tsx";
import AdminPlaceholder from "./pages/AdminPlaceholder.tsx";
import AllQuestions from "./pages/AllQuestions.tsx";
import AdminSettings from "./pages/AdminSettings.tsx";
import CreateExam from "./pages/CreateExam.tsx";
import ExamSchedules from "./pages/ExamSchedules.tsx";
import MyExams from "./pages/MyExams.tsx";
import TakeExam from "./pages/TakeExam.tsx";
import ExamResult from "./pages/ExamResult.tsx";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route index element={<Index />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="my-exams" element={<MyExams />} />
            <Route path="my-exams/take/:examId" element={<TakeExam />} />
            <Route path="my-exams/result/:attemptId" element={<ExamResult />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPlaceholder />} />
            <Route path="academic/classes" element={<AdminPlaceholder />} />
            <Route path="academic/subjects" element={<AdminPlaceholder />} />
            <Route path="question-bank/create-ai" element={<CreateQuestionAI />} />
            <Route path="question-bank/questions" element={<AllQuestions />} />
            <Route path="exam/create" element={<CreateExam />} />
            <Route path="exam/schedules" element={<ExamSchedules />} />
            <Route path="practice-sheets" element={<AdminPlaceholder />} />
            <Route path="students" element={<AdminPlaceholder />} />
            <Route path="teachers" element={<AdminPlaceholder />} />
            <Route path="organization" element={<AdminPlaceholder />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
