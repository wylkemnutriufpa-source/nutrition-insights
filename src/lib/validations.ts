import { z } from "zod";

// =========================================
// Auth Schemas
// =========================================
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido")
    .max(255, "E-mail muito longo"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .max(128, "Senha muito longa"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido")
    .max(255, "E-mail muito longo"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Senha deve ter pelo menos 6 caracteres")
      .max(128, "Senha muito longa"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// =========================================
// Patient Schemas
// =========================================
export const createPatientSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido")
    .max(255, "E-mail muito longo"),
  full_name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  phone: z
    .string()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
});
export type CreatePatientFormData = z.infer<typeof createPatientSchema>;

// =========================================
// Chat Schemas
// =========================================
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Mensagem não pode ser vazia")
    .max(5000, "Mensagem muito longa"),
});
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;

// =========================================
// Profile Schemas
// =========================================
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  phone: z
    .string()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

// =========================================
// Financial Schemas
// =========================================
export const financialTransactionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(255, "Descrição muito longa"),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["income", "expense"]),
  category: z.string().max(50).optional(),
  date: z.string().min(1, "Data é obrigatória"),
});
export type FinancialTransactionFormData = z.infer<typeof financialTransactionSchema>;
