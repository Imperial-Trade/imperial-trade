
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Education from "./pages/Education";
import Signals from "./pages/Signals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/education" element={<Education />} />
          <Route path="/signals" element={<Signals />} />
          {/* Placeholder routes for other sidebar items */}
          <Route path="/live" element={<Index />} />
          <Route path="/community" element={<Index />} />
          <Route path="/partnership" element={<Index />} />
          <Route path="/tools" element={<Index />} />
          <Route path="/analysis" element={<Index />} />
          <Route path="/calendar" element={<Index />} />
          <Route path="/performance" element={<Index />} />
          <Route path="/progress" element={<Index />} />
          <Route path="/notifications" element={<Index />} />
          <Route path="/messages" element={<Index />} />
          <Route path="/settings" element={<Index />} />
          <Route path="/about" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
