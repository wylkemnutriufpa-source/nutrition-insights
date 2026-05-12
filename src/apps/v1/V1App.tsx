import React from 'react';
import { CoreProviders } from "./providers/CoreProviders";
import { AppRoutes } from "./routes/AppRoutes";
import "./index.css";
import "./App.css";

const V1App = () => {
  return (
    <CoreProviders>
      <AppRoutes />
    </CoreProviders>
  );
};

export default V1App;
