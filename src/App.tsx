
import { useState } from "react";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import AppBootExperience from "./components/common/AppBootExperience";
import { useAuth } from "./lib/auth";

const AppContent = () => {
  const { authStatus } = useAuth();
  const [bootComplete, setBootComplete] = useState(false);
  
  // O AppBootExperience deve rodar até que o auth esteja resolvido (autenticado ou não)
  // e o tempo mínimo de animação tenha passado.
  const dataReady = authStatus !== "loading";

  if (!bootComplete) {
    return (
      <AppBootExperience 
        dataReady={dataReady} 
        onComplete={() => setBootComplete(true)} 
      />
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
