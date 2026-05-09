/**
 * Utilitário de cópia resiliente para evitar erros da Clipboard API em navegadores restritos ou via iframe.
 */

export function copyToClipboard(text: string): Promise<boolean> {
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text: string): boolean {
  try {
    // Método 2: textarea (funciona em TODOS os navegadores)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Garantir que não seja visível e não cause scroll
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    
    document.body.appendChild(textarea);
    
    // Salvar seleção atual
    const selected = document.getSelection()?.rangeCount && document.getSelection()?.rangeCount! > 0
      ? document.getSelection()?.getRangeAt(0)
      : false;
      
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Restaurar seleção
    if (selected) {
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(selected);
    }
    
    return successful;
  } catch (err) {
    console.error("[clipboard] Fallback copy failed:", err);
    return false;
  }
}
