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

export const validateWhatsApp = (val: string) => {
  if (!val) {
    return { isValid: false, error: "WhatsApp é obrigatório" };
  }
  
  const digits = val.replace(/\D/g, "");
  
  // Basic length check for international numbers (min 7 digits, max 15)
  if (digits.length < 7) {
    return { isValid: false, error: "Número muito curto" };
  }
  
  if (digits.length > 15) {
    return { isValid: false, error: "Número muito longo" };
  }

  // Specific Brazil validation if no country code or starts with 55
  const isBrazil = !val.startsWith("+") || val.startsWith("+55") || digits.startsWith("55");
  if (isBrazil) {
    const brDigits = digits.startsWith("55") ? digits.slice(2) : digits;
    if (brDigits.length < 10 || brDigits.length > 11) {
      return { isValid: false, error: "Número brasileiro deve ter 10 ou 11 dígitos (com DDD)" };
    }
  }

  return { isValid: true, error: "" };
};
