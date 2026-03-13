// Fix react-i18next type incompatibility with Radix UI components
// See: https://github.com/i18next/react-i18next/issues/1543
import "react-i18next";

declare module "react-i18next" {
  interface CustomTypeOptions {
    allowObjectInHTMLChildren: false;
  }
}
