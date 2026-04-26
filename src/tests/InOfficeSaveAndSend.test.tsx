import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeStepFinalize from '@/components/in-office/InOfficeStepFinalize';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  };
  // Ensure chaining works by returning the mock itself for certain methods
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.in.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  
  return { supabase: mock };
});


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InOfficeStepFinalize 
          patientId="pat-123" 
          sessionId="sess-123" 
          onPrev={() => {}} 
          onComplete={() => {}} 
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InOfficeStepFinalize - Save and Send E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSupabase = supabase as any;
    
    // Default mock responses for data loading
    mockSupabase.maybeSingle.mockImplementation((path: string) => {
      // InOfficeStepFinalize calls maybeSingle multiple times
      // 1. Session load
      // 2. Profile load
      // 3. Meal plan status check
      // 4. Story check
      return Promise.resolve({ data: {}, error: null });
    });

    // Special case for loading session with meal_plan_id
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'sess-123', meal_plan_id: 'plan-123' }, error: null }) // session
      .mockResolvedValueOnce({ data: { full_name: 'John Doe' }, error: null }) // profile
      .mockResolvedValueOnce({ data: { plan_status: 'draft' }, error: null }) // meal plan
      .mockResolvedValueOnce({ data: null, error: null }); // story
  });

  it('should choose a template and publish the plan successfully', async () => {
    const mockSupabase = supabase as any;
    renderComponent();

    // Verify initial state
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    
    const publishButton = await screen.findByRole('button', { name: /Salvar e Enviar ao Paciente/i });
    expect(publishButton).toBeInTheDocument();

    // Mock successful update
    mockSupabase.update.mockResolvedValue({ data: null, error: null });

    // Click Publish
    fireEvent.click(publishButton);

    // Verify publication process
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_plans');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        plan_status: 'published_to_patient',
        is_active: true
      }));
    });

    // Verify success message
    await waitFor(() => expect(screen.getByText(/Plano publicado com sucesso/i)).toBeInTheDocument());
  });

  it('should show retry button when publication fails and allow retrying', async () => {
    const mockSupabase = supabase as any;
    renderComponent();

    const publishButton = await screen.findByRole('button', { name: /Salvar e Enviar ao Paciente/i });
    
    // Mock failure
    mockSupabase.update.mockResolvedValueOnce({ data: null, error: { message: 'Database connection failed' } });

    fireEvent.click(publishButton);

    // Verify error message and retry button
    await waitFor(() => {
      expect(screen.getByText(/Falha na comunicação com o servidor/i)).toBeInTheDocument();
      expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument();
    });

    // Mock success for second attempt
    mockSupabase.update.mockResolvedValueOnce({ data: null, error: null });
    
    fireEvent.click(screen.getByText(/Tentar novamente/i));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/Plano Ativo e Enviado/i)).toBeInTheDocument();
    });
  });

});
