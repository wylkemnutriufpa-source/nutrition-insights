
import { useState } from "react";
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import AppBootExperience from "./components/common/AppBootExperience";
import { useAuth } from "./lib/auth";

const AppContent = () => {
  const { authStatus } = useAuth();
  const [bootComplete, setBootComplete] = useState(false);
  
  // O boot visual (vídeo girando) aparece enquanto os dados carregam
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
