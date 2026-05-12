import React, { useEffect, useState } from 'react';
import { usePatientJourneyStatus } from '@/hooks/usePatientJourneyStatus';
import { useAuth } from '@/lib/auth';
import { Shield, Activity, Lock, Unlock } from 'lucide-react';

/**
 * Stability Monitor for Audit Mode.
 * Visible only in development or when explicitly enabled.
 */
export const OnboardingStabilityMonitor = () => {
  const { status, isTransitioning, loading } = usePatientJourneyStatus();
  const { user } = useAuth();
  const [history, setHistory] = useState<{state: string, time: string}[]>([]);

  useEffect(() => {
    if (status) {
      setHistory(prev => [{ state: status, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
    }
  }, [status]);

  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=true')) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 text-[10px] text-white/70 font-mono shadow-2xl w-64 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          Stability Monitor
        </div>
        <div className={`px-1.5 py-0.5 rounded ${isTransitioning ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
          {isTransitioning ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span>Patient:</span>
          <span className="text-white truncate max-w-[100px]">{user?.email || 'Guest'}</span>
        </div>
        <div className="flex justify-between">
          <span>Current State:</span>
          <span className="text-emerald-400 font-bold underline">{status || (loading ? 'Loading...' : 'None')}</span>
        </div>
        <div className="flex justify-between">
          <span>Transitioning:</span>
          <span className={isTransitioning ? "text-amber-500" : "text-white/40"}>{isTransitioning ? "LOCKED" : "READY"}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1 mb-1 text-[8px] uppercase text-white/30">
          <Activity className="w-2 h-2" /> Transition Log
        </div>
        <div className="space-y-1">
          {history.map((h, i) => (
            <div key={i} className="flex justify-between opacity-80">
              <span>{h.state}</span>
              <span className="text-white/20">{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
