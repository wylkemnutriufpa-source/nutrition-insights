export const formatInternationalWhatsApp = (val: string) => {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  
  // Check if it already has a country code (e.g., starts with +)
  if (val.startsWith("+")) {
    return val.replace(/\s/g, "");
  }

  // Default to Brazil if 10-11 digits and no country code
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`;
  }

  // If it's longer, assume it has a country code but missing the +
  if (digits.length > 11) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
};

export const WHATSAPP_ERROR_MESSAGES = {
  REQUIRED: "WhatsApp é obrigatório",
  TOO_SHORT: "Número muito curto",
  TOO_LONG: "Número muito longo",
  BRAZIL_INVALID: "Número brasileiro deve ter 10 ou 11 dígitos (com DDD)",
};

export const validateWhatsApp = (val: string) => {
  if (!val) {
    return { isValid: false, error: WHATSAPP_ERROR_MESSAGES.REQUIRED };
  }
  
  const digits = val.replace(/\D/g, "");
  
  // Basic length check for international numbers (min 7 digits, max 15)
  if (digits.length < 7) {
    return { isValid: false, error: WHATSAPP_ERROR_MESSAGES.TOO_SHORT };
  }
  
  if (digits.length > 15) {
    return { isValid: false, error: WHATSAPP_ERROR_MESSAGES.TOO_LONG };
  }

  // Specific Brazil validation if no country code or starts with 55
  const isBrazil = !val.startsWith("+") || val.startsWith("+55") || digits.startsWith("55");
  if (isBrazil) {
    const brDigits = digits.startsWith("55") ? digits.slice(2) : digits;
    if (brDigits.length < 10 || brDigits.length > 11) {
      return { isValid: false, error: WHATSAPP_ERROR_MESSAGES.BRAZIL_INVALID };
    }
  }

  return { isValid: true, error: "" };
};

export const normalizeWhatsApp = (val: string) => {
  return val.replace(/\D/g, "");
};

