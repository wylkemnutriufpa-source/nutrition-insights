import { useEffect } from "react";

export function MobileAutoFixer() {
  useEffect(() => {
    const fixOverflow = () => {
      // Restriction: Only apply fixes inside active Dialogs or the main application container
      // This prevents global adjustments on elements that shouldn't be touched
      const dialogs = document.querySelectorAll('[role="dialog"], .dialog-content');
      const mainContainer = document.querySelector('main, #root > div:not([role="dialog"])');
      
      const applyFix = (el: HTMLElement) => {
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
            childEl.style.maxWidth = '100%';
            childEl.style.overflowX = 'hidden';
          }
        });
      };

      dialogs.forEach((d) => applyFix(d as HTMLElement));
      if (mainContainer) applyFix(mainContainer as HTMLElement);
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
