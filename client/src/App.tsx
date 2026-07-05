import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/lib/protected-route";
import { SpeedInsights } from "@vercel/speed-insights/react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NetWorth from "@/pages/NetWorth";
import IncomeStrategy from "@/pages/IncomeStrategy";
import Reports from "@/pages/Reports";
import Billing from "@/pages/Billing";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Pricing from "@/pages/Pricing";
import Onboarding from "@/pages/Onboarding";
import PDFReportPreview from "@/pages/PDFReportPreview";
import TrustCenter from "@/pages/TrustCenter";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Disclaimer from "@/pages/Disclaimer";
import Security from "@/pages/Security";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import DataPrivacyCenter from "@/pages/DataPrivacyCenter";
import UploadDemo from "@/pages/UploadDemo";
import CsvImportReview from "@/pages/CsvImportReview";
import LaunchChecklist from "@/pages/LaunchChecklist";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/income-strategy" component={IncomeStrategy} />
      <Route path="/demo" component={IncomeStrategy} />
      <Route path="/trust-center" component={TrustCenter} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/security" component={Security} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/upload" component={UploadDemo} />
      <Route path="/admin/launch" component={LaunchChecklist} />
      <Route path="/data-privacy">
        <ProtectedRoute><DataPrivacyCenter /></ProtectedRoute>
      </Route>
      <Route path="/documents/:id/review">
        <ProtectedRoute><CsvImportReview /></ProtectedRoute>
      </Route>
      <Route path="/reports/preview/:id" component={PDFReportPreview} />
      <Route path="/onboarding">
        <ProtectedRoute><Onboarding /></ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/net-worth">
        <ProtectedRoute><NetWorth /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><Reports /></ProtectedRoute>
      </Route>
      <Route path="/billing">
        <ProtectedRoute><Billing /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
