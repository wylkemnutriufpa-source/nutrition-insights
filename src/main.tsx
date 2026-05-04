import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hard Clear no Boot: Se a URL contiver ?clear, limpa tudo e recomeça
if (window.location.search.includes('clear')) {
  console.log("[HARD CLEAR] Limpando estados locais...");
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = window.location.origin + '/auth';
}

const DebugOverlay = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    backgroundColor: 'red',
    color: 'white',
    zIndex: 9999,
    padding: '10px',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    pointerEvents: 'none'
  }}>
    ROTA ATUAL: {window.location.pathname}
  </div>
);

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(
    <>
      <DebugOverlay />
      <App />
    </>
  );
}
