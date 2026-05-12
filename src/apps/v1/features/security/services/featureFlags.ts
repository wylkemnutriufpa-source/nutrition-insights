
export const FEATURE_FLAGS = {
  editorV3: true,
  clinicalMode: true,
  audit: true,
  system_stability_mode: true
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  // In a real app, this could check env vars or a remote config
  return FEATURE_FLAGS[flag] ?? false;
};
