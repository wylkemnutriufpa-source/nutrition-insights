import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Patients from "../Patients";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { usePatientsList, useAddPatient } from "@/hooks/queries/usePatientsList";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Create a mock navigate function
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock DashboardLayout to avoid complex nested dependencies
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/queries/usePatientsList", () => ({
  usePatientsList: vi.fn(),
  useAddPatient: vi.fn(),
  useTogglePatientStatus: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveFromProgram: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateExpiry: vi.fn(() => ({ mutate: vi.fn() })),
  useBulkToggle: vi.fn(() => ({ mutate: vi.fn() })),
  useAssignToProgram: vi.fn(() => ({ mutate: vi.fn() })),
  trackPatientView: vi.fn(),
  DEFAULT_PAGE_SIZE: 10,
}));

vi.mock("@/hooks/useOnlinePatients", () => ({
  useOnlinePatients: vi.fn(() => ({ onlineUsers: [] })),
}));

}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

describe("Patients Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: "user-123" } });
    (usePatientsList as any).mockReturnValue({
      data: {
        patients: [],
        programs: [],
        prestigePlans: [],
        pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
        counts: { active: 0, inactive: 0 },
      },
      isLoading: false,
    });
  });

  it("should register a patient and redirect to their profile", async () => {
    const mutateAsync = vi.fn().mockResolvedValue("new-patient-id");
    (useAddPatient as any).mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderWithProviders(<Patients />);

    // Open registration dialog
    const addButton = screen.getByText(/Adicionar Paciente/i);
    fireEvent.click(addButton);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Nome completo/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/paciente@email.com/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Fit@2026!/i), { target: { value: "Password123!" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /Cadastrar Paciente/i });
    fireEvent.click(submitButton);

    // Verify mutation called
    expect(mutateAsync).toHaveBeenCalledWith({
      email: "john@example.com",
      name: "John Doe",
      password: "Password123!",
    });

    // Wait for redirection
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/patients/new-patient-id");
    });
  });

  it("should show error toast if patientId is missing", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(null);
    (useAddPatient as any).mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderWithProviders(<Patients />);

    // Open registration dialog
    const addButton = screen.getByText(/Adicionar Paciente/i);
    fireEvent.click(addButton);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Nome completo/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByPlaceholderText(/paciente@email.com/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Fit@2026!/i), { target: { value: "Password123!" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar Paciente/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro: Falha ao obter ID do paciente");
    });
  });
});
