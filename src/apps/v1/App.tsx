
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuth } from "./lib/auth";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";

const AppContent = () => {
  const { loading } = useAuth();

  // Se a sessão principal ainda está sendo recuperada do Supabase,
  // mostramos o loader oficial em vídeo.
  if (loading) {
    return <BrainLoaderScreen visible />;
  }

  return <AppRoutes />;
};

const App = () => (
  <CoreProviders>
    <AppContent />
  </CoreProviders>
);

export default App;
