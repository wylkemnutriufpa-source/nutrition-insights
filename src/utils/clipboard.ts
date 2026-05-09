import { toast } from "sonner";

/**
 * Tries to copy text to clipboard using the modern Clipboard API.
 * Falls back to showing a warning if it fails.
 */
export const copyToClipboard = async (text: string, label?: string) => {
  try {
    // Check if navigator.clipboard is available (requires HTTPS and user gesture)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for non-secure contexts or unsupported browsers
    // We don't use document.execCommand('copy') as it's deprecated and unreliable
    throw new Error("Clipboard API not available or blocked");
  } catch (err) {
    // Silently catch to avoid console errors as requested
    
    // If it fails, we return false so the UI can show a fallback input
    toast.error("Erro ao copiar automaticamente", {
      description: "Por favor, selecione e copie o link manualmente."
    });
    
    return false;
  }
};
