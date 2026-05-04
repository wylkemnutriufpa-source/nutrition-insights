
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuth } from "./lib/auth";
import IndependentLoader from "./components/ui/IndependentLoader";

const AppContent = () => {
  const { loading } = useAuth();

  // Exibição baseada puramente no estado de carregamento da autenticação
  if (loading) {
    return <IndependentLoader />;
  }

  return <AppRoutes />;
};

const App = () => (
  <CoreProviders>
    <AppContent />
  </CoreProviders>
);

export default App;
