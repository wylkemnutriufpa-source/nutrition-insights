import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from 'react';

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(<App />);
}
