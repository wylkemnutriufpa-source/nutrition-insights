import "react-i18next";
import { ReactNode } from "react";

declare module "react-i18next" {
  interface CustomTypeOptions {
    // Fixes type incompatibility between react-i18next and @radix-ui
    defaultNS: "translation";
  }

  // Override ReactI18NextChildren to be compatible with ReactNode
  export type ReactI18NextChildren = ReactNode;
}
