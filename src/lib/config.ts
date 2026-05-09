/**
 * Configurações globais do FitJourney (Frontend)
 */

export const PRODUCTION_URL = "https://www.fitjourney.com.br";
export const OFFICIAL_DOMAIN = "www.fitjourney.com.br";

export const BASE_URL = PRODUCTION_URL;

export const getOfficialUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PRODUCTION_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
};

export const isOfficialDomain = () => {
  return typeof window !== "undefined" && window.location.hostname === OFFICIAL_DOMAIN;
};
