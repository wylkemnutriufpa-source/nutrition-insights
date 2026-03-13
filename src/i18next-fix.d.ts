import "react-i18next";
import type { ReactNode } from "react";

// Fix react-i18next ReactI18NextChildren type incompatibility with Radix UI
// See: https://github.com/i18next/react-i18next/issues/1543
declare module "react-i18next" {
  type ReactI18NextChildren = ReactNode;
}
