// Stub: critical contracts.
export type CriticalContractId = string;

export const CRITICAL_CONTRACTS: Record<string, any> = {};

const noopContract = { id: '', validate: async (..._args: any[]) => ({ ok: true, errors: [] }) };

export const draftIntegrityContract = noopContract;
export const clinicalValidityContract = noopContract;
export const engineDeterminismContract = noopContract;
export const persistenceSafetyContract = noopContract;
export const uiConsistencyContract = noopContract;
