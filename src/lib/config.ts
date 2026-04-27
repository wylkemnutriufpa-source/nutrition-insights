/**
 * Configurações globais do FitJourney (Frontend)
 */

export const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://www.fitjourney.com.br";
export const OFFICIAL_DOMAIN = "www.fitjourney.com.br";

export const isOfficialDomain = () => {
  return window.location.hostname === OFFICIAL_DOMAIN;
};
