import { describe, it, expect } from "vitest";
import { getInvitationUrl, getQuickLinkUrl, getWhatsAppInvitationMessage, formatProfessionalName } from "../invitation";

describe("invitation utils", () => {
  describe("getInvitationUrl", () => {
    it("should generate a canonical invite URL with code and nutriId", () => {
      const url = getInvitationUrl("CODE123", "NUTRI456", true);
      expect(url).toContain("/cadastro?code=CODE123&nutri=NUTRI456");
    });

    it("should handle missing code/nutriId gracefully", () => {
      const url = getInvitationUrl(undefined, undefined, true);
      expect(url).toContain("/cadastro");
      expect(url).not.toContain("?");
    });
  });

  describe("getQuickLinkUrl", () => {
    it("should generate a quick link URL", () => {
      const url = getQuickLinkUrl("NUTRI456", true);
      expect(url).toContain("/vincular/NUTRI456");
    });
  });

  describe("formatProfessionalName", () => {
    it("should keep titles like Dr. or Dra.", () => {
      expect(formatProfessionalName("Dr. Wylkem Raiol")).toBe("Dr. Wylkem Raiol");
      expect(formatProfessionalName("Nutri Ana")).toBe("Nutri Ana");
    });

    it("should truncate long names without titles to first two parts", () => {
      expect(formatProfessionalName("Wylkem Raiol da Silva Junior")).toBe("Wylkem Raiol");
    });

    it("should handle empty or null", () => {
      // @ts-ignore
      expect(formatProfessionalName(null)).toBe("");
      expect(formatProfessionalName("")).toBe("");
    });
  });

  describe("getWhatsAppInvitationMessage", () => {
    const baseParams = {
      patientName: "João",
      professionalName: "Dr. Wylkem",
      invitationCode: "CODE123",
      professionalId: "NUTRI456"
    };

    it("should generate a patient_onboarding message by default", () => {
      const msg = getWhatsAppInvitationMessage(baseParams);
      expect(msg).toContain("João");
      expect(msg).toContain("Dr. Wylkem");
      expect(msg).toContain("cadastro?code=CODE123");
    });

    it("should handle null/undefined params by using fallbacks", () => {
      // @ts-ignore
      const msg = getWhatsAppInvitationMessage({ patientName: null, professionalName: null });
      expect(msg).toContain("Paciente");
      expect(msg).toContain("Dr. Wylkem Raiol");
    });
  });
});
