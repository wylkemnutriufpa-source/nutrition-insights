import { useState, useEffect } from 'react';

export function useBetaMode() {
  const [isBeta, setIsBeta] = useState<boolean>(() => {
    const saved = localStorage.getItem('fj_beta_mode');
    return saved === 'true';
  });

  const toggleBeta = () => {
    const newValue = !isBeta;
    setIsBeta(newValue);
    localStorage.setItem('fj_beta_mode', String(newValue));
    // Reload to ensure all components pick up the change if needed, 
    // or just rely on state if the switcher is high enough.
    window.location.reload();
  };

  return { isBeta, toggleBeta };
}
