import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { getWhatsAppInvitationMessage } from "../functions/_shared/invitation-logic.ts";

Deno.test("WhatsApp Invitation Message - Basic Formatting", () => {
  const message = getWhatsAppInvitationMessage({
    patientName: "João Silva",
    professionalName: "Dra. Maria",
    clinicName: "Clínica Saúde",
    invitationCode: "CODE123",
    professionalId: "PRO1",
    templateType: "patient_invite"
  });

  assertEquals(message.includes("Olá João!"), true);
  assertEquals(message.includes("Dra. Maria"), true);
  assertEquals(message.includes("Clínica Saúde"), true);
  assertEquals(message.includes("CODE123"), true);
});

Deno.test("WhatsApp Invitation Message - Fallbacks", () => {
  const message = getWhatsAppInvitationMessage({
    patientName: "",
    professionalName: "",
    invitationCode: "CODE123",
    templateType: "patient_invite"
  });

  assertEquals(message.includes("Olá Paciente!"), true);
  assertEquals(message.includes("Seu Nutricionista"), true);
  assertEquals(message.includes("da clínica"), false); // Clinic should not be present if empty
});

Deno.test("WhatsApp Invitation Message - Custom Template", () => {
  const customTemplate = "Oi {{patientName}}, aqui é a {{professionalName}}. Link: {{url}}";
  const message = getWhatsAppInvitationMessage({
    patientName: "João",
    professionalName: "Maria",
    invitationCode: "123",
    customTemplate
  });

  assertEquals(message, "Oi João, aqui é a Maria. Link: https://www.fitjourney.com.br/cadastro?code=123");
});
