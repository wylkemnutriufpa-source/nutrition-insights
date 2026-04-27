/**
 * Configurações globais do FitJourney (Frontend)
 */

export const PRODUCTION_URL = "https://www.fitjourney.com.br";
export const OFFICIAL_DOMAIN = "www.fitjourney.com.br";

export const BASE_URL = typeof window !== "undefined" 
  ? (window.location.hostname.includes("lovable") || window.location.hostname.includes("localhost")
      ? window.location.origin 
      : PRODUCTION_URL)
  : PRODUCTION_URL;

export const isOfficialDomain = () => {
  return typeof window !== "undefined" && window.location.hostname === OFFICIAL_DOMAIN;
};
