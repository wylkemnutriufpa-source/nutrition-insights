import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logRegression } from '../lib/regressionGuard';
import { supabase } from '../integrations/supabase/client';
import { logWarn } from '../lib/monitoring';

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

vi.mock('../lib/monitoring', () => ({
  logWarn: vi.fn()
}));

describe('System Stability & Regression Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve lidar com falha de conexão com Supabase ao registrar log de regressão', async () => {
    const mockError = { message: 'Failed to fetch', code: 'PGRST116' };
    
    // Mocking supabase.from().insert() to return an error
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue(Promise.resolve({ error: mockError }))
    });

    logRegression({
      affected_flow: 'Test Flow',
      detected_issue: 'Test Issue',
      severity: 'high',
      source_layer: 'frontend',
      auto_fallback_applied: false
    });

    // Wait for the async promise in logRegression to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logWarn).toHaveBeenCalledWith('RegressionGuard', expect.stringContaining('Falha ao salvar log: Failed to fetch'));
  });

  it('deve lidar com ausência da tabela regression_guard_logs', async () => {
    const mockError = { message: 'relation "regression_guard_logs" does not exist', code: '42P01' };
    
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnValue(Promise.resolve({ error: mockError }))
    });

    logRegression({
      affected_flow: 'Schema Check',
      detected_issue: 'Table missing',
      severity: 'critical',
      source_layer: 'database',
      auto_fallback_applied: false
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logWarn).toHaveBeenCalledWith('RegressionGuard', expect.stringContaining('relation "regression_guard_logs" does not exist'));
  });

  it('deve garantir que o sistema degrade com segurança sem travar a UI em caso de erro no log', () => {
    // This is essentially verified by the fact that logRegression doesn't throw and doesn't return a promise that needs to be awaited to continue UI operations.
    // The implementation uses .then() and handles errors internally.
    
    expect(() => {
      logRegression({
        affected_flow: 'Safe UI',
        detected_issue: 'UI should not block',
        severity: 'low',
        source_layer: 'frontend',
        auto_fallback_applied: true
      });
    }).not.toThrow();
  });
});
