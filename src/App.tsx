import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import CreateQuestionAI from "./pages/CreateQuestionAI.tsx";
import AdminPlaceholder from "./pages/AdminPlaceholder.tsx";
import AllQuestions from "./pages/AllQuestions.tsx";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminPlaceholder />} />
            <Route path="academic/classes" element={<AdminPlaceholder />} />
            <Route path="academic/subjects" element={<AdminPlaceholder />} />
            <Route path="question-bank/create-ai" element={<CreateQuestionAI />} />
            <Route path="question-bank/questions" element={<AllQuestions />} />
            <Route path="exam/create" element={<AdminPlaceholder />} />
            <Route path="exam/schedules" element={<AdminPlaceholder />} />
            <Route path="practice-sheets" element={<AdminPlaceholder />} />
            <Route path="students" element={<AdminPlaceholder />} />
            <Route path="teachers" element={<AdminPlaceholder />} />
            <Route path="organization" element={<AdminPlaceholder />} />
            <Route path="settings" element={<AdminPlaceholder />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
