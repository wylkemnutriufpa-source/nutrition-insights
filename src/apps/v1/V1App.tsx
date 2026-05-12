import "./index.css";
import "./App.css";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuth } from "./lib/auth";
import { Loader2 } from "lucide-react";

const SimpleLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    <p className="text-sm text-muted-foreground animate-pulse">Carregando FitJourney...</p>
  </div>
);

const AppContent = () => {
  const { loading, authStatus } = useAuth();
  
  console.log("[V1App] Auth Debug:", { loading, authStatus });

  // Se a sessão principal ainda está sendo recuperada do Supabase,
  // mostramos o loader oficial em vídeo.
  if (loading) {
    return <SimpleLoader />;
  }

  return <AppRoutes />;
};

const App = () => (
  <CoreProviders>
    <AppContent />
  </CoreProviders>
);

export default App;
