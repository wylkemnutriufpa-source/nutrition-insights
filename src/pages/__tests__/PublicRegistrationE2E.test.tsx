import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PatientRegister from "../PatientRegister";
import Invitation from "../Invitation";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
    auth: {
      signUp: vi.fn(),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactNode, initialEntries = ["/"]) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/cadastro" element={<PatientRegister />} />
            <Route path="/convite/:code" element={<Invitation />} />
          </Routes>
          {initialEntries[0] === "/" && component}
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

describe("Public Registration E2E Simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID if not available in environment
    if (!global.crypto.randomUUID) {
      global.crypto.randomUUID = () => "test-uuid-123" as any;
    }
  });

  it("should load /cadastro?nutri=ID without errors and enable the button", async () => {
    const nutriId = "nutri-123";
    
    // Mock profile fetch
    (supabase.from as any)().maybeSingle.mockResolvedValueOnce({
      data: { user_id: nutriId, full_name: "Dr. Healthy", avatar_url: null, phone: "123" },
      error: null
    });
    // Mock professional profile fetch
    (supabase.from as any)().maybeSingle.mockResolvedValueOnce({
      data: { clinic_name: "Healthy Clinic" },
      error: null
    });
    // Mock existence check
    (supabase.from as any)().maybeSingle.mockResolvedValueOnce({
      data: { user_id: nutriId },
      error: null
    });

    renderWithProviders(<PatientRegister />, [`/cadastro?nutri=${nutriId}`]);

    // Check if nutritionist name is visible
    await waitFor(() => {
      expect(screen.getByText("Dr. Healthy")).toBeInTheDocument();
    });

    // Button should be enabled (not disabled)
    const submitButton = screen.getByRole("button", { name: /Concluir Cadastro/i });
    expect(submitButton).not.toBeDisabled();
    
    // Check for logs with CID
    expect(screen.getByText(/CID:test-uuid-123/)).toBeInTheDocument();
  });

  it("should load /convite/:code and display professional data correctly", async () => {
    const invitationCode = "INVITE-2024";
    
    // Mock edge function invoke
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        success: true,
        invitation: {
          professional_id: "nutri-123",
          patient_name: "John Doe",
          professional: { full_name: "Dr. Healthy", avatar_url: null },
          clinic: { name: "Healthy Clinic" }
        }
      },
      error: null
    });

    renderWithProviders(<Invitation />, [`/convite/${invitationCode}`]);

    // Check if professional data is visible
    await waitFor(() => {
      expect(screen.getByText("Dr. Healthy")).toBeInTheDocument();
      expect(screen.getByText(/Olá, John!/i)).toBeInTheDocument();
      expect(screen.getByText("Healthy Clinic")).toBeInTheDocument();
    });

    // Check for "Começar Agora" button
    expect(screen.getByText(/Começar Agora/i)).toBeInTheDocument();
  });

  it("should show detailed error screen on /convite/:code when code is invalid", async () => {
    const invitationCode = "INVALID-CODE";
    
    // Mock edge function invoke failure
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        success: false,
        error_code: "INVALID_CODE",
        message: "Este link de convite é inválido ou não foi encontrado."
      },
      error: null
    });

    renderWithProviders(<Invitation />, [`/convite/${invitationCode}`]);

    await waitFor(() => {
      expect(screen.getByText("Convite não encontrado")).toBeInTheDocument();
      expect(screen.getByText(/O link pode estar incompleto ou incorreto/i)).toBeInTheDocument();
      expect(screen.getByText(/Passos para resolver/i)).toBeInTheDocument();
      expect(screen.getByText(/Verifique se você copiou o link inteiro/i)).toBeInTheDocument();
    });
  });
});