
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Education from "./pages/dashboard/education/Education";
import Course from "./pages/dashboard/education/Course";
import Watch from "./pages/dashboard/education/Watch";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div className="min-h-screen bg-background flex items-center justify-center"><h1 className="text-4xl font-bold">Imperial Trading Academy</h1></div>} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Education />} />
              <Route path="education" element={<Education />} />
              <Route path="education/course/:courseId" element={<Course />} />
              <Route path="education/watch/:courseId/:lessonIndex" element={<Watch />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
