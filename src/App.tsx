import React from 'react';
import { AppProviders } from './core/app-shell/AppProviders';
import { AppRouter } from './core/app-shell/AppRouter';

/**
 * App.tsx — Somente Composição.
 * A infraestrutura e lógica de boot residem em src/core/app-shell.
 */
const App = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;
