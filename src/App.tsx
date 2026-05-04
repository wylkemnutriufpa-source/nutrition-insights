
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuth } from "./lib/auth";
import IndependentLoader from "./components/ui/IndependentLoader";

const AppContent = () => {
  const { loading } = useAuth();

  // Exibição baseada puramente no estado de carregamento da autenticação
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'sans-serif' 
      }}>
        <h1>Carregando...</h1>
      </div>
    );
  }

  return <AppRoutes />;
};

const App = () => (
  <CoreProviders>
    <AppContent />
  </CoreProviders>
);

export default App;
