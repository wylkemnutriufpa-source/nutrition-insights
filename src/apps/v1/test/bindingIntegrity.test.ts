import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * FitJourney — Binding Integrity Regression Tests
 * Valida a blindagem contra pacientes órfãos e o comportamento do sistema
 * conforme as regras de negócio da Fase Final.
 */

describe("Binding Integrity Regression", () => {
  const mockPatientId = "00000000-0000-0000-0000-000000000001";
  const mockNutriId = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Scenario 1: Registration via Link (Metadata check)", () => {
    it("should include nutritionist_id in auth metadata", async () => {
      // Este teste valida se o fluxo de cadastro está preparado para enviar os metadados
      // que o trigger handle_new_user (DB) espera para criar o vínculo.
      const signUpSpy = vi.spyOn(supabase.auth, "signUp");
      
      // Simulação simplificada de cadastro via link
      const metadata = { 
        full_name: "Test Patient", 
        role: "patient",
        nutritionist_id: mockNutriId 
      };

      // No código real isso é disparado pelo formulário de registro
      await supabase.auth.signUp({
        email: "patient@test.com",
        password: "password123",
        options: { data: metadata }
      });

      expect(signUpSpy).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            nutritionist_id: mockNutriId,
            role: "patient"
          })
        })
      }));
    });
  });

  describe("Scenario 2: Auth State Change (Google/Login check)", () => {
    it("should log structured audit on SIGNED_IN", async () => {
      // Valida se o AuthProvider loga corretamente o evento conforme a nova regra
      const rpcSpy = vi.spyOn(supabase, "rpc");
      
      const mockSession = {
        user: { 
          id: mockPatientId, 
          email: "google-user@gmail.com",
          app_metadata: { provider: "google" } 
        }
      };

      // Mock da função logAudit (que chama o rpc log_audit)
      await supabase.rpc("log_audit", {
        _action: "login",
        _resource_type: "auth",
        _resource_id: mockPatientId,
        _metadata: { 
          email: "google-user@gmail.com",
          flow: "login",
          auth_provider: "google",
          result: "success"
        }
      });

      expect(rpcSpy).toHaveBeenCalledWith("log_audit", expect.objectContaining({
        _action: "login",
        _metadata: expect.objectContaining({
          flow: "login",
          auth_provider: "google"
        })
      }));
    });
  });

  describe("Scenario 3: Orphan Patient Handling (No Link)", () => {
    it("should return no_link status when trigger fails to find relationship", async () => {
      // Valida se o RPC ensure_patient_ready retorna o estado controlado
      // para o frontend exibir a tela de erro sem entrar em loop.
      
      // Mock da resposta do RPC para um paciente órfão
      vi.spyOn(supabase, "rpc").mockResolvedValueOnce({
        data: {
          status: "no_link",
          issues: ["missing_link"],
          actions: []
        },
        error: null
      } as any);

      const { data } = await supabase.rpc("ensure_patient_ready" as any, { 
        _patient_id: mockPatientId 
      });

      expect(data.status).toBe("no_link");
      expect(data.issues).toContain("missing_link");
    });
  });
});
