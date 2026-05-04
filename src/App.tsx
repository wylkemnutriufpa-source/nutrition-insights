
import { useState } from "react";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import AppBootExperience from "./components/common/AppBootExperience";
import { useAuth } from "./lib/auth";

const AppContent = () => {
  const { authStatus } = useAuth();
  const [bootComplete, setBootComplete] = useState(false);
  
  // No Recovery Mode, pulamos o boot se houver qualquer sinal de loop
  const dataReady = authStatus !== "loading";

  // Desativado boot para destravar UI em loop
  return <AppRoutes />;
};

const App = () => (
  <CoreProviders>
    <AppContent />
  </CoreProviders>
);

export default App;
