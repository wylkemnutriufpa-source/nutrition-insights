import "./index.css";
import "./App.css";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuth } from "./lib/auth";
import { Loader2 } from "lucide-react";

const SimpleLoader = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] animate-pulse">FitJourney</p>
  </div>
);

const AppContent = () => {
  const { loading, authStatus } = useAuth();
  
  console.log("[V1App] Current State:", { loading, authStatus, path: window.location.pathname });

  // Forçar renderização do AppRoutes se não estiver explicitamente carregando a sessão inicial
  if (loading && authStatus === "loading") {
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
