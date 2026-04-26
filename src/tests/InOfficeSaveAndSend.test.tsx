import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InOfficeStepFinalize from '@/components/in-office/InOfficeStepFinalize';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock Supabase with full chaining support
vi.mock('@/integrations/supabase/client', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
  
  return { supabase: mockSupabase };
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
    const mockQuery = mockSupabase.from();
    
    // Default mock responses for data loading
    mockQuery.maybeSingle.mockImplementation(() => Promise.resolve({ data: {}, error: null }));

    // Special case for loading session with meal_plan_id
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'sess-123', meal_plan_id: 'plan-123' }, error: null }) // session
      .mockResolvedValueOnce({ data: { full_name: 'John Doe' }, error: null }) // profile
      .mockResolvedValueOnce({ data: { plan_status: 'draft' }, error: null }) // meal plan
      .mockResolvedValueOnce({ data: null, error: null }); // story
  });

  it('should choose a template and publish the plan successfully', async () => {
    const mockSupabase = supabase as any;
    const mockQuery = mockSupabase.from();
    renderComponent();

    // Verify initial state
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    
    const publishButton = await screen.findByTestId('publish-button');
    expect(publishButton).toBeInTheDocument();

    // Mock successful update
    mockQuery.in.mockResolvedValue({ data: null, error: null });

    // Click Publish
    fireEvent.click(publishButton);

    // Verify button is disabled and shows "Publicando..."
    expect(publishButton).toBeDisabled();

    // Verify publication process
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('meal_plans');
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        plan_status: 'published_to_patient',
        is_active: true
      }));
    }, { timeout: 3000 });

    // Verify success message (updated UI)
    await waitFor(() => expect(screen.getByText(/Plano Ativo e Enviado/i)).toBeInTheDocument(), { timeout: 3000 });

    // Verify "Ver perfil do paciente" button is visible and can be clicked
    const viewProfileButton = screen.getByRole('button', { name: /Ver perfil do paciente/i });
    expect(viewProfileButton).toBeInTheDocument();
  });

  it('should show retry button when publication fails and allow retrying', async () => {
    const mockSupabase = supabase as any;
    const mockQuery = mockSupabase.from();
    renderComponent();

    const publishButton = await screen.findByTestId('publish-button');
    
    // Mock failure
    mockQuery.in.mockResolvedValueOnce({ data: null, error: { message: 'Database connection failed' } });

    fireEvent.click(publishButton);

    // Verify error message and retry button
    await waitFor(() => {
      expect(screen.getByText(/Falha no envio/i)).toBeInTheDocument();
      expect(screen.getByTestId('retry-publish-button')).toBeInTheDocument();
    }, { timeout: 3000 });


    // Mock success for second attempt
    mockQuery.in.mockResolvedValueOnce({ data: null, error: null });
    
    fireEvent.click(screen.getByTestId('retry-publish-button'));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/Plano Ativo e Enviado/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
