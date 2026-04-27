import { describe, it, expect } from "vitest";
import { getWhatsAppTemplate, buildWhatsAppUrl } from "../whatsappNotification";

describe("WhatsApp Notification Utils", () => {
  const params = {
    patientName: "Wannubia Maria",
    professionalName: "Nutri Fit",
    appUrl: "https://app.fitjourney.com.br/plano",
    clinicName: "Vida Saudável"
  };

  it("should generate correct meal_plan_ready template", () => {
    const msg = getWhatsAppTemplate("meal_plan_ready", params);
    expect(msg).toContain("Olá Wannubia!");
    expect(msg).toContain("Nutri Fit");
    expect(msg).toContain("Seu plano alimentar está pronto!");
    expect(msg).toContain(params.appUrl);
  });

  it("should generate correct protocol_activated template with clinic name", () => {
    const msg = getWhatsAppTemplate("protocol_activated", params);
    expect(msg).toContain("Seu novo protocolo foi ativado por Nutri Fit da clínica *Vida Saudável*");
  });

  it("should generate correct registration_updated template", () => {
    const msg = getWhatsAppTemplate("registration_updated", params);
    expect(msg).toContain("Seu cadastro foi atualizado com sucesso");
  });

  it("should build correct WhatsApp API URL with encoding", () => {
    const phone = "+5511999999999";
    const message = "Olá! Seu link: https://test.com?p=1";
    const url = buildWhatsAppUrl(phone, message);
    
    expect(url).toBe("https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1!%20Seu%20link%3A%20https%3A%2F%2Ftest.com%3Fp%3D1");
  });

  it("should handle names with only one word", () => {
    const msg = getWhatsAppTemplate("meal_plan_ready", { ...params, patientName: "Wannubia" });
    expect(msg).toContain("Olá Wannubia!");
  });
});
