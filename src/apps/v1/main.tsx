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

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(<App />);
}
