// Fix react-i18next ReactI18NextChildren type incompatibility with Radix UI
// This overrides the problematic type at the global level
declare module "react-i18next" {
  // Force ReactI18NextChildren to be ReactNode-compatible
  type ReactI18NextChildren = React.ReactNode;
}
