import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MealPlanEditorV2 from "../MealPlanEditorV2";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ error: null, data: [] }))
      }))
    }))
  }
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

// Mock hooks to avoid heavy lifting
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "123" } }) }));
vi.mock("@/lib/tenantContext", () => ({ useTenant: () => ({ tenantId: "tenant-123" }) }));

describe("MealPlanEditorV2 Schema Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MealPlanEditorV2 />
      </BrowserRouter>
    </QueryClientProvider>
  );

  it("blocks flow and shows toast on undefined_column error (42703)", async () => {
    // Mock 42703 error
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ 
          error: { code: "42703", message: "column undefined" }, 
          data: null 
        }))
      }))
    });

    renderComponent();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Erro de Schema"),
        expect.anything()
      );
    });
  });

  it("does not block flow on RLS error (42501)", async () => {
    // Mock 42501 error
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ 
          error: { code: "42501", message: "new row violates RLS" }, 
          data: null 
        }))
      }))
    });

    renderComponent();

    // We expect it to NOT show the schema drift toast
    await waitFor(() => {
      const calls = (toast.error as any).mock.calls;
      const hasSchemaError = calls.some((call: any) => 
        typeof call[0] === 'string' && call[0].includes("Erro de Schema")
      );
      expect(hasSchemaError).toBe(false);
    });
  });
});

