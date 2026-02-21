import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BootScreen from "@/components/BootScreen";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { applyAppearance, getBackgroundImagePreference, getThemePreference } from "@/lib/appearance";
import { toast } from "sonner";

// Lazy load all route components for code splitting
const Desktop = lazy(() => import("./pages/Desktop"));
const Auth = lazy(() => import("./pages/Auth"));
const SiteGate = lazy(() => import("./pages/SiteGate"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const Admin = lazy(() => import("./pages/admin"));
const Install = lazy(() => import("./pages/Install"));
const TopUpSuccess = lazy(() => import("./pages/TopUpSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Stock = lazy(() => import("./pages/Stock"));
const Logz = lazy(() => import("./pages/Logz"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Games = lazy(() => import("./pages/Games"));
const Forum = lazy(() => import("./pages/Forum"));
const Lounge = lazy(() => import("./pages/Lounge"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Homepage = lazy(() => import("./pages/Homepage"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Cart = lazy(() => import("./pages/Cart"));
const Settings = lazy(() => import("./pages/Settings"));

// Loading fallback component
const RouteLoader = () => <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>;
const queryClient = new QueryClient();
function AppRoutes() {
  const {
    user,
    loading
  } = useAuth();
  const [hasSeenAnnouncements, setHasSeenAnnouncements] = useState(() => {
    return sessionStorage.getItem('announcements_seen') === 'true';
  });

  useEffect(() => {
    const updatesEnabled = localStorage.getItem('updates_notifications_enabled') === 'true';
    if (!user || !updatesEnabled) return;

    const channel = supabase
      .channel('announcement-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const announcement = payload.new as { title?: string; message?: string; is_active?: boolean };
          if (!announcement?.is_active) return;

          toast.info(announcement.title || 'New update', {
            description: announcement.message || 'A new announcement was published.',
          });

          if (Notification.permission === 'granted') {
            new Notification(announcement.title || 'DarkMarket Update', {
              body: announcement.message || 'Open the app to view details.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>;
  }

  // Allow unauthenticated users to access /auth route for invites
  if (!user) {
    return <ChunkErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-auth" element={<Auth />} />
            <Route path="*" element={<SiteGate />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>;
  }

  // Show announcements if user hasn't seen them this session
  if (!hasSeenAnnouncements) {
    return <ChunkErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <Announcements onContinue={() => setHasSeenAnnouncements(true)} />
        </Suspense>
      </ChunkErrorBoundary>;
  }
  return <ChunkErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/desktop" element={<Desktop />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin-auth" element={<Auth />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/install" element={<Install />} />
          <Route path="/topup-success" element={<TopUpSuccess />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/logz" element={<Logz />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/games" element={<Games />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/lounge" element={<Lounge />} />
          <Route path="/giftcards" element={<GiftCards />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ChunkErrorBoundary>;
}
function AppContent() {
  const [showBoot, setShowBoot] = useState(true);
  const [hasBooted, setHasBooted] = useState(false);
  useEffect(() => {
    // Check if we've already shown boot screen this session
    const booted = sessionStorage.getItem('hell5tar_booted');
    if (booted) {
      setShowBoot(false);
      setHasBooted(true);
    }
  }, []);

  useEffect(() => {
    applyAppearance(getThemePreference(), getBackgroundImagePreference());
  }, []);
  const handleBootComplete = () => {
    setShowBoot(false);
    setHasBooted(true);
    sessionStorage.setItem('hell5tar_booted', 'true');
  };
  return <>
      {showBoot && !hasBooted && <BootScreen onComplete={handleBootComplete} />}
      <div className="chain-overlay">
        <AppRoutes />
      </div>
    </>;
}
const App = () => <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>;
export default App;
