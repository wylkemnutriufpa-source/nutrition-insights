import { useEffect } from "react";

export function MobileAutoFixer() {
  useEffect(() => {
    const fixOverflow = () => {
      // Find active dialogs
      const activeDialogs = document.querySelectorAll('[role="dialog"], .dialog-content');
      
      // If no dialog is active, we might still want to check the main container, 
      // but according to requirements: "correções apenas dentro do dialog aberto (role=dialog ativo) e no seu container principal"
      // This implies we should be careful about touching anything else.
      
      const applyFix = (el: HTMLElement) => {
        // Mark element as processed to avoid redundant fixes and for testing
        el.setAttribute('data-autofixed', 'true');
        
        const rect = el.getBoundingClientRect();
        
        if (rect.width > window.innerWidth) {
          el.style.maxWidth = '100vw';
          el.style.overflowX = 'hidden';
          el.style.boxSizing = 'border-box';
          
          if (el.classList.contains('p-6') || el.classList.contains('p-4')) {
            el.style.paddingLeft = '1rem';
            el.style.paddingRight = '1rem';
          }
        }
        
        // Check children for overflow relative to parent
        const children = el.querySelectorAll('*');
        children.forEach((child) => {
          const childEl = child as HTMLElement;
          const childRect = childEl.getBoundingClientRect();
          if (childRect.right > rect.right || childRect.left < rect.left) {
            childEl.setAttribute('data-autofixed', 'true');
            childEl.style.maxWidth = '100%';
            childEl.style.overflowX = 'hidden';
          }
        });
      };

      // Only apply fixes if there's an active dialog
      if (activeDialogs.length > 0) {
        activeDialogs.forEach((d) => applyFix(d as HTMLElement));
      } else {
        // Optional: still check main container if explicitly required, 
        // but the prompt says "apenas dentro do dialog aberto... e no seu container principal"
        // Let's assume it means the container OF the dialog if it exists, or just the active dialog itself.
        // We'll skip global fixes when no dialog is present to satisfy "ensure elements outside are not altered"
      }
    };

    const observer = new MutationObserver(fixOverflow);
    observer.observe(document.body, { childList: true, subtree: true });
    
    window.addEventListener('resize', fixOverflow);
    fixOverflow();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fixOverflow);
    };
  }, []);

  return null;
}
