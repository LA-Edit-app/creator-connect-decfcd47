import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { BrandThemeProvider } from "@/context/BrandThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ComingSoon from "./pages/ComingSoon";

const Index = lazy(() => import("./pages/Index"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignTracker = lazy(() => import("./pages/CampaignTracker"));
const Creators = lazy(() => import("./pages/Creators"));
const Settings = lazy(() => import("./pages/Settings"));
const AgencySettings = lazy(() => import("./pages/AgencySettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const XeroCallback = lazy(() => import("./pages/XeroCallback"));

const queryClient = new QueryClient();

const RouteFallback = () => <div className="min-h-screen bg-background" />;

const AppRoutes = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const isLocalSupabase = Boolean(supabaseUrl?.includes("localhost:54321"));
  const bypassAuthInDev =
    import.meta.env.DEV && (import.meta.env.VITE_DEV_BYPASS_AUTH === "true" || isLocalSupabase);
  const { session, loading } = useAuth();
  const isAuthenticated = Boolean(session?.user);

  useEffect(() => {
    const warmRoutes = () => {
      void import("./pages/Campaigns");
      void import("./pages/Creators");

    };

    if (bypassAuthInDev) {
      const timeoutId = window.setTimeout(warmRoutes, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (!isAuthenticated) return;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 1000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(warmRoutes, 250);
    return () => window.clearTimeout(timeoutId);
  }, [bypassAuthInDev, isAuthenticated]);

  if (bypassAuthInDev) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Index />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign-tracker" element={<CampaignTracker />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/analytics" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/agency-settings" element={<AgencySettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/xero/callback" element={<XeroCallback />} />
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Index /> : <ComingSoon />}
        />
        <Route
          path="/campaigns"
          element={isAuthenticated ? <Campaigns /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/campaign-tracker"
          element={isAuthenticated ? <CampaignTracker /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/creators"
          element={isAuthenticated ? <Creators /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/analytics"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/agency-settings"
          element={isAuthenticated ? <AgencySettings /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="*"
          element={isAuthenticated ? <NotFound /> : <ComingSoon />}
        />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </BrandThemeProvider>
  </QueryClientProvider>
);

export default App;
