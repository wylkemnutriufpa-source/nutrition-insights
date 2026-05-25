/**
 * ══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE PROTECTED — APP BOOTSTRAP
 * ESTABILIZAÇÃO SOBERANA LOCKDOWN
 * NÃO ALTERAR SEM APROVAÇÃO EXPLÍCITA DE GOVERNANÇA
 * ══════════════════════════════════════════════════════════════════════════
 */
import React, { Suspense } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import PageLoader from './components/common/PageLoader';
import { useAuth } from './lib/auth';

const App = () => {
  const { loading } = useAuth();
  
  if (loading) return <PageLoader />;

  return (
    <div className="relative min-h-screen">
      <Suspense fallback={<PageLoader />}>
        <AppRoutes />
      </Suspense>
    </div>
  );
};

export default App;

export default App;
