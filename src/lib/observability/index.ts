/**
 * FitJourney — Observability Layer
 * Central export for all observability services.
 */
export { logSystemError, captureError } from "./errorLogger";
export { startPerfTrace, logPerf } from "./perfTracker";
export { trackEvent, PatientEvents, ProfessionalEvents } from "./behaviorTracker";
export { useSystemHealth } from "./useSystemHealth";
