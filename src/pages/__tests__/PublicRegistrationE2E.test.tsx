import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PatientRegister from "../PatientRegister";
import Invitation from "../Invitation";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";

// Mock useAuth
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

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
    if (!global.crypto.randomUUID) {
      global.crypto.randomUUID = () => "test-uuid-123" as any;
    }
  });

  it("should load /cadastro?nutri=ID and show the invitation screen", async () => {
    const nutriId = "nutri-123";
    
    // Setup mocks for profile and professional_profiles
    const fromMock = supabase.from as any;
    fromMock.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === "profiles") {
            return Promise.resolve({ data: { user_id: nutriId, full_name: "Dr. Healthy", avatar_url: null, phone: "123" }, error: null });
          }
          if (table === "professional_profiles") {
            return Promise.resolve({ data: { clinic_name: "Healthy Clinic" }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
    });

    renderWithProviders(null, [`/cadastro?nutri=${nutriId}`]);

    // Should see the invitation acceptance screen first
    expect(await screen.findByText(/Você está sendo convidado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Dr. Healthy/)).toBeInTheDocument();
  });

  it("should load /convite/:code and display professional data correctly", async () => {
    const invitationCode = "INVITE-2024";
    
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

    renderWithProviders(null, [`/convite/${invitationCode}`]);

    expect(await screen.findByText(/Você está sendo convidado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Dr. Healthy/)).toBeInTheDocument();
    expect(await screen.findByText(/Olá, John!/i)).toBeInTheDocument();
  });

  it("should show detailed error screen on /convite/:code when code is invalid", async () => {
    const invitationCode = "INVALID-CODE";
    
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: {
        success: false,
        error_code: "INVALID_CODE",
        message: "Este link de convite é inválido ou não foi encontrado."
      },
      error: null
    });

    renderWithProviders(null, [`/convite/${invitationCode}`]);

    expect(await screen.findByText("Convite não encontrado")).toBeInTheDocument();
    expect(await screen.findByText(/O link pode estar incompleto ou incorreto/i)).toBeInTheDocument();
    expect(await screen.findByText(/Passos para resolver/i)).toBeInTheDocument();
  });
});